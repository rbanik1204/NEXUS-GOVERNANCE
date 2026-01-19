import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
    Deposit as DepositEvent,
    Withdrawal as WithdrawalEvent,
    BudgetCreated as BudgetCreatedEvent,
    BudgetApproved as BudgetApprovedEvent,
    SpendingLimitUpdated as SpendingLimitUpdatedEvent
} from "../generated/TreasuryManager/TreasuryManager"
import { TreasuryTransaction, Budget, DailyStats } from "../generated/schema"

export function handleDeposit(event: DepositEvent): void {
    let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    let tx = new TreasuryTransaction(id)
    tx.transactionHash = event.transaction.hash
    tx.type = "DEPOSIT"
    tx.token = event.params.token
    tx.tokenSymbol = "ETH" // Simplified
    tx.amount = event.params.amount
    tx.from = event.params.from
    tx.to = event.address
    tx.timestamp = event.params.timestamp
    tx.blockNumber = event.block.number
    tx.save()

    updateDailyStats(event.block.timestamp, "deposit", event.params.amount)
}

export function handleWithdrawal(event: WithdrawalEvent): void {
    let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    let tx = new TreasuryTransaction(id)
    tx.transactionHash = event.transaction.hash
    tx.type = "WITHDRAWAL"
    tx.token = event.params.token
    tx.tokenSymbol = "ETH" // Simplified
    tx.amount = event.params.amount
    tx.from = event.address
    tx.to = event.params.to
    tx.timestamp = event.params.timestamp
    tx.blockNumber = event.block.number
    tx.save()

    updateDailyStats(event.block.timestamp, "withdrawal", event.params.amount)
}

export function handleBudgetCreated(event: BudgetCreatedEvent): void {
    let budget = new Budget(event.params.budgetId.toString())
    budget.budgetId = event.params.budgetId
    budget.category = event.params.category
    budget.amount = event.params.amount
    budget.spent = BigInt.fromI32(0)
    budget.remaining = event.params.amount
    budget.token = Bytes.fromHexString("0x0000000000000000000000000000000000000000") // ETH
    budget.createdAt = event.block.timestamp
    budget.approvers = []
    budget.status = "PENDING"
    budget.save()
}

export function handleBudgetApproved(event: BudgetApprovedEvent): void {
    let budget = Budget.load(event.params.budgetId.toString())
    if (budget != null) {
        let approvers = budget.approvers
        approvers.push(event.params.approver)
        budget.approvers = approvers
        budget.status = "ACTIVE"
        budget.approvedAt = event.block.timestamp
        budget.save()
    }
}

export function handleSpendingLimitUpdated(event: SpendingLimitUpdatedEvent): void {
    // Logic for spending limits if needed
}

function updateDailyStats(timestamp: BigInt, type: string, amount: BigInt): void {
    let dayTs = (timestamp.toI32() / 86400) * 86400
    let dayId = dayTs.toString()
    let stats = DailyStats.load(dayId)
    if (stats != null) {
        if (type == "deposit") {
            stats.treasuryDeposits = stats.treasuryDeposits.plus(amount)
        } else {
            stats.treasuryWithdrawals = stats.treasuryWithdrawals.plus(amount)
        }
        stats.save()
    }
}
