(define-constant ERR_VOUCHER_NOT_FOUND u103)
(define-constant ERR_VOUCHER_ALREADY_USED u104)
(define-constant ERR_LICENSE_NOT_FOUND u105)
(define-constant ERR_NON_TRANSFERABLE u1000)

(define-non-fungible-token decentrakey-license uint)

(define-data-var last-id uint u0)

(define-map vouchers
  uint
  {
    recipient: principal,
    software-name: (string-ascii 256),
    license-duration-days: uint
  }
)

(define-map used-vouchers uint bool)

(define-constant METADATA_URI "https://decentrakey.s3.amazonaws.com/license-metadata.json")

(define-read-only (get-last-token-id)
  (ok (var-get last-id))
)

(define-read-only (get-token-uri (token-id uint))
  (ok (some METADATA_URI))
)

(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? decentrakey-license token-id))
)

(define-read-only (get-voucher (voucher-id uint))
  (ok {
    details: (map-get? vouchers voucher-id),
    used: (is-some (map-get? used-vouchers voucher-id))
  })
)

(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (err ERR_NON_TRANSFERABLE)
)

(define-public (create-voucher (recipient principal) (software-name (string-ascii 256)) (duration-days uint))
  (let ((new-id (+ (var-get last-id) u1)))
    (begin
      (map-set vouchers new-id {
        recipient: recipient,
        software-name: software-name,
        license-duration-days: duration-days
      })
      (var-set last-id new-id)
      (ok new-id)
    )
  )
)

(define-public (redeem-voucher (voucher-id uint))
  (let ((voucher (unwrap! (map-get? vouchers voucher-id) (err ERR_VOUCHER_NOT_FOUND))))
    (begin
      (asserts! (is-none (map-get? used-vouchers voucher-id)) (err ERR_VOUCHER_ALREADY_USED))
      (asserts! (is-eq tx-sender (get recipient voucher)) (err ERR_LICENSE_NOT_FOUND))
      (try! (nft-mint? decentrakey-license voucher-id (get recipient voucher)))
      (map-set used-vouchers voucher-id true)
      (ok true)
    )
  )
)

(define-read-only (verify-license (license-id uint) (user principal))
  (ok (is-eq
        user
        (unwrap! (nft-get-owner? decentrakey-license license-id) (err ERR_LICENSE_NOT_FOUND))
     ))
)
