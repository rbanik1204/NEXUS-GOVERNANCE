import { BigInt } from "@graphprotocol/graph-ts"
import {
    IdentityRegistered as IdentityRegisteredEvent,
    IdentityVerified as IdentityVerifiedEvent,
    IdentityRevoked as IdentityRevokedEvent
} from "../generated/DIDRegistry/DIDRegistry"
import { Citizen } from "../generated/schema"

export function handleIdentityRegistered(event: IdentityRegisteredEvent): void {
    let citizen = Citizen.load(event.params.wallet.toHexString())
    if (citizen == null) {
        citizen = new Citizen(event.params.wallet.toHexString())
        citizen.address = event.params.wallet
        citizen.registeredAt = event.params.timestamp
        citizen.status = "PENDING"
        citizen.votingPower = BigInt.fromI32(0)
        citizen.delegatedPower = BigInt.fromI32(0)
        citizen.identityVerified = false
        citizen.totalProposals = 0
        citizen.totalVotes = 0
        citizen.participationRate = BigInt.fromI32(0).toBigDecimal()
    }

    citizen.identityHash = event.params.identityHash
    citizen.save()
}

export function handleIdentityVerified(event: IdentityVerifiedEvent): void {
    let citizen = Citizen.load(event.params.wallet.toHexString())
    if (citizen != null) {
        citizen.identityVerified = true
        citizen.verifiedAt = event.params.timestamp
        citizen.verifier = event.params.verifier
        citizen.save()
    }
}

export function handleIdentityRevoked(event: IdentityRevokedEvent): void {
    let citizen = Citizen.load(event.params.wallet.toHexString())
    if (citizen != null) {
        citizen.identityVerified = false
        citizen.status = "REVOKED"
        citizen.save()
    }
}
