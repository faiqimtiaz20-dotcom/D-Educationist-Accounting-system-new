import { chartOfAccountsTemplate, findAccountType } from '@/lib/coa'
import type { AccountNode, JournalEntry, JournalLine } from '@/types'

function cloneCoa(nodes: AccountNode[]): AccountNode[] {
  return nodes.map((n) => ({
    ...n,
    balance: 0,
    children: n.children ? cloneCoa(n.children) : undefined,
  }))
}

function applyLineToNode(node: AccountNode, line: JournalLine): void {
  if (node.code === line.accountCode) {
    const type = node.type
    const delta = type === 'asset' || type === 'expense'
      ? line.debit - line.credit
      : line.credit - line.debit
    node.balance += delta
    return
  }
  node.children?.forEach((child) => applyLineToNode(child, line))
}

export function applyJournalToCoa(coa: AccountNode[], lines: JournalLine[]): void {
  for (const line of lines) {
    coa.forEach((node) => applyLineToNode(node, line))
  }
}

export function computeChartOfAccounts(journalEntries: JournalEntry[]): AccountNode[] {
  const coa = cloneCoa(chartOfAccountsTemplate)
  const posted = journalEntries.filter(
    (e) => e.approvalStatus === 'Approved' || e.isAutoPosted
  )
  for (const entry of posted) {
    applyJournalToCoa(coa, entry.lines)
  }
  return coa
}

export function sumBalance(node: AccountNode): number {
  if (!node.children?.length) return node.balance
  return node.children.reduce((sum, child) => sum + sumBalance(child), 0)
}

export function isJournalBalanced(lines: JournalLine[]): boolean {
  const debit = lines.reduce((s, l) => s + l.debit, 0)
  const credit = lines.reduce((s, l) => s + l.credit, 0)
  return debit > 0 && Math.abs(debit - credit) < 0.01
}

export function getTrialBalance(journalEntries: JournalEntry[]) {
  const coa = computeChartOfAccounts(journalEntries)
  const rows: { code: string; name: string; type: string; debit: number; credit: number }[] = []

  function walk(nodes: AccountNode[]) {
    for (const node of nodes) {
      if (node.children?.length) {
        walk(node.children)
      } else if (Math.abs(node.balance) > 0.001) {
        const type = findAccountType(node.code) ?? node.type
        const isDebitNormal = type === 'asset' || type === 'expense'
        rows.push({
          code: node.code,
          name: node.name,
          type,
          debit: isDebitNormal && node.balance > 0 ? node.balance : (!isDebitNormal && node.balance < 0 ? Math.abs(node.balance) : 0),
          credit: !isDebitNormal && node.balance > 0 ? node.balance : (isDebitNormal && node.balance < 0 ? Math.abs(node.balance) : 0),
        })
      }
    }
  }

  walk(coa)
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
  return { rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 }
}
