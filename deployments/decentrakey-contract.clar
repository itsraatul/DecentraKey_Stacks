;; DecentraKey: On-Chain Software Licensing
;; This contract manages the creation and verification of non-transferable software licenses (SBTs).
;; It includes the necessary public functions to be SIP-009 compliant and viewable in wallets.

;; --- Constants and Error Codes ---
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED u101)
(define-constant ERR_ISSUER_NOT_AUTHORIZED u102)
(define-constant ERR_VOUCHER_NOT_FOUND u103)
(define-constant ERR_VOUCHER_ALREADY_USED u104)
(define-constant ERR_LICENSE_NOT_FOUND u105)

;; --- Data Storage ---
(define-non-fungible-token decentrakey-license uint)
(define-data-var sbt-last-token-id uint u0)
(define-map authorized-issuers principal bool)
(define-map vouchers uint {
  recipient: principal,
  software-name: (string-ascii 256),
  license-duration-days: uint
})
(define-map used-vouchers uint bool)

;; --- Contract Metadata (for wallet display) ---
(define-constant METADATA_URI "https://decentrakey.s3.amazonaws.com/license-metadata.json")

;; --- SIP-009 Compliant Read-Only Functions ---
(define-read-only (get-last-token-id)
  (ok (var-get sbt-last-token-id))
)
(define-read-only (get-token-uri (token-id uint))
  (ok (some METADATA_URI))
)
(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? decentrakey-license token-id))
)

;; --- Admin Functions ---
(define-public (add-authorized-issuer (issuer-principal principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) (err ERR_UNAUTHORIZED))
    (map-set authorized-issuers issuer-principal true)
    (ok true)
  )
)

;; --- Company Functions ---
(define-public (create-voucher (recipient principal) (software-name (string-ascii 256)) (duration-days uint))
  (begin
    (asserts! (is-some (map-get? authorized-issuers tx-sender)) (err ERR_ISSUER_NOT_AUTHORIZED))
    (let ((new-license-id (+ (var-get sbt-last-token-id) u1)))
      (map-set vouchers new-license-id {
        recipient: recipient,
        software-name: software-name,
        license-duration-days: duration-days
      })
      (var-set sbt-last-token-id new-license-id)
      (ok new-license-id)
    )
  )
)

;; --- Customer Functions ---
(define-public (redeem-voucher (voucher-id uint))
  (let ((voucher-details (unwrap! (map-get? vouchers voucher-id) (err ERR_VOUCHER_NOT_FOUND))))
    (begin
      (asserts! (is-none (map-get? used-vouchers voucher-id)) (err ERR_VOUCHER_ALREADY_USED))
      (asserts! (is-eq tx-sender (get recipient voucher-details)) (err ERR_UNAUTHORIZED))
      (try! (nft-mint? decentrakey-license voucher-id (get recipient voucher-details)))
      (map-set used-vouchers voucher-id true)
      (ok true)
    )
  )
)

;; --- Public Read-Only Functions ---
(define-read-only (verify-license (license-id uint) (user principal))
  (ok (is-eq user (unwrap! (nft-get-owner? decentrakey-license license-id) (err ERR_LICENSE_NOT_FOUND))))
)
