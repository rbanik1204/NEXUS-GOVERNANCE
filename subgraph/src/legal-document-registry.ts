import { BigInt } from "@graphprotocol/graph-ts"
import {
    DocumentCreated as DocumentCreatedEvent,
    DocumentApproved as DocumentApprovedEvent,
    DocumentActivated as DocumentActivatedEvent,
    ConstitutionUpdated as ConstitutionUpdatedEvent
} from "../generated/LegalDocumentRegistry/LegalDocumentRegistry"
import { LegalDocument } from "../generated/schema"

export function handleDocumentCreated(event: DocumentCreatedEvent): void {
    let doc = new LegalDocument(event.params.docId.toString())
    doc.documentId = event.params.docId
    let docTypeMap = ["CONSTITUTION", "POLICY", "REGULATION", "AMENDMENT", "PROCEDURE", "COMPLIANCE_RULE", "LEGAL_OPINION", "AUDIT_REPORT"]
    doc.docType = docTypeMap[event.params.docType]
    doc.title = event.params.title
    doc.contentHash = event.transaction.hash // Placeholder
    doc.status = "DRAFT"
    doc.author = event.params.author
    doc.createdAt = event.block.timestamp
    doc.save()
}

export function handleDocumentApproved(event: DocumentApprovedEvent): void {
    let doc = LegalDocument.load(event.params.docId.toString())
    if (doc != null) {
        doc.status = "APPROVED"
        doc.approvedAt = event.params.timestamp
        doc.approver = event.params.approver
        doc.save()
    }
}

export function handleDocumentActivated(event: DocumentActivatedEvent): void {
    let doc = LegalDocument.load(event.params.docId.toString())
    if (doc != null) {
        doc.status = "ACTIVE"
        doc.activatedAt = event.params.timestamp
        doc.save()
    }
}

export function handleConstitutionUpdated(event: ConstitutionUpdatedEvent): void {
    let oldDoc = LegalDocument.load(event.params.oldId.toString())
    if (oldDoc != null) {
        oldDoc.status = "SUPERSEDED"
        oldDoc.supersededBy = event.params.newId.toString()
        oldDoc.save()
    }

    let newDoc = LegalDocument.load(event.params.newId.toString())
    if (newDoc != null) {
        newDoc.supersedes = event.params.oldId.toString()
        newDoc.save()
    }
}
