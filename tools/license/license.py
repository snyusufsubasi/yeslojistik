#!/usr/bin/env python3
"""YES Lojistik lisans aracı (SATICI tarafı). Müşteriye ve repoya girmez; özel anahtar yalnız satıcıdadır.

Komutlar:
  keygen --out ozel-anahtar.pem            Anahtar çifti üretir; özel anahtarı verilen dosyaya yazar, genel anahtarı ekrana basar.
  issue  --customer "Firma" --plan Standart --vehicles 20 --days 365 [--features eFatura,uetds] [--instance-id X]
                                           Lisans anahtarı üretir (özel anahtar dosyası LICENSE_PRIVATE_KEY_FILE ortam değişkeninden).
  verify ANAHTAR --public-key GENEL_ANAHTAR  Bir anahtarı çözüp içeriğini gösterir (imzayı doğrular).

Anahtar biçimi sunucudakiyle aynıdır: base64url(yük).base64url(imza); ECDSA P-256 / SHA-256, imza r||s (64 bayt).
Gerekli paket: cryptography (pip install cryptography).
"""
import argparse
import base64
import json
import os
import stat
import sys
from datetime import datetime, timedelta, timezone

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature, encode_dss_signature

PLANS = ["Deneme", "Baslangic", "Standart", "Profesyonel", "Kurumsal"]
ENV_KEY_FILE = "LICENSE_PRIVATE_KEY_FILE"


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def unb64url(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def public_key_text(key: ec.EllipticCurvePrivateKey | ec.EllipticCurvePublicKey) -> str:
    pub = key.public_key() if isinstance(key, ec.EllipticCurvePrivateKey) else key
    der = pub.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    return base64.b64encode(der).decode()


def load_private_key() -> ec.EllipticCurvePrivateKey:
    path = os.environ.get(ENV_KEY_FILE)
    if not path:
        sys.exit(f"Hata: {ENV_KEY_FILE} ortam değişkeni ayarlı değil (özel anahtar dosyasının yolu).")
    try:
        with open(path, "rb") as f:
            key = serialization.load_pem_private_key(f.read(), password=None)
    except OSError as e:
        sys.exit(f"Hata: özel anahtar dosyası okunamadı: {e}")
    if not isinstance(key, ec.EllipticCurvePrivateKey) or not isinstance(key.curve, ec.SECP256R1):
        sys.exit("Hata: özel anahtar ECDSA P-256 olmalı.")
    return key


def cmd_keygen(args: argparse.Namespace) -> None:
    if os.path.exists(args.out):
        sys.exit(f"Hata: {args.out} zaten var; üzerine yazılmaz. Başka bir ad verin.")
    key = ec.generate_private_key(ec.SECP256R1())
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    fd = os.open(args.out, os.O_WRONLY | os.O_CREAT | os.O_EXCL, stat.S_IRUSR | stat.S_IWUSR)
    with os.fdopen(fd, "wb") as f:
        f.write(pem)
    print(f"Özel anahtar yazıldı: {args.out}  (yalnız sizde kalsın; yedekleyin, repoya ve müşteriye VERMEYİN)")
    print("Genel anahtar (sunucuda License__PublicKey olarak verilir):")
    print(public_key_text(key))


def cmd_issue(args: argparse.Namespace) -> None:
    key = load_private_key()
    if args.days <= 0:
        sys.exit("Hata: --days 0'dan büyük olmalı.")
    if args.vehicles < 0:
        sys.exit("Hata: --vehicles 0 (sınırsız) ya da daha büyük olmalı.")
    now = datetime.now(timezone.utc).replace(microsecond=0)
    payload = {
        "customer": args.customer.strip(),
        "plan": args.plan,
        "vehicleLimit": args.vehicles,
        "features": [f.strip() for f in args.features.split(",") if f.strip()],
        "issuedAt": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "expiresAt": (now + timedelta(days=args.days)).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    if args.instance_id:
        payload["instanceId"] = args.instance_id.strip()
    if not payload["customer"]:
        sys.exit("Hata: --customer boş olamaz.")
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    r, s = decode_dss_signature(key.sign(body, ec.ECDSA(hashes.SHA256())))
    signature = r.to_bytes(32, "big") + s.to_bytes(32, "big")
    # Bilgi stderr'e, anahtar stdout'a: `issue ... > anahtar.txt` yalnız anahtarı yazar.
    print(f"{payload['customer']} | {payload['plan']} | araç: {payload['vehicleLimit'] or 'sınırsız'} | bitiş: {payload['expiresAt']}", file=sys.stderr)
    print(f"{b64url(body)}.{b64url(signature)}")


def cmd_verify(args: argparse.Namespace) -> None:
    body_text, _, sig_text = args.token.strip().partition(".")
    try:
        body, sig = unb64url(body_text), unb64url(sig_text)
        pub = serialization.load_der_public_key(base64.b64decode(args.public_key))
        pub.verify(encode_dss_signature(int.from_bytes(sig[:32], "big"), int.from_bytes(sig[32:], "big")), body, ec.ECDSA(hashes.SHA256()))
    except (InvalidSignature, ValueError, TypeError):
        sys.exit("GEÇERSİZ: imza doğrulanamadı.")
    print(json.dumps(json.loads(body), ensure_ascii=False, indent=2))
    print("İmza geçerli.")


def main() -> None:
    parser = argparse.ArgumentParser(description="YES Lojistik lisans aracı (satıcı tarafı)")
    sub = parser.add_subparsers(dest="command", required=True)

    k = sub.add_parser("keygen", help="anahtar çifti üret")
    k.add_argument("--out", required=True, help="özel anahtarın yazılacağı dosya (örn. ~/lisans/ozel-anahtar.pem)")
    k.set_defaults(func=cmd_keygen)

    i = sub.add_parser("issue", help="müşteri için lisans anahtarı üret")
    i.add_argument("--customer", required=True, help="müşteri firma adı")
    i.add_argument("--plan", required=True, choices=PLANS)
    i.add_argument("--vehicles", required=True, type=int, help="araç sınırı (0 = sınırsız)")
    i.add_argument("--days", required=True, type=int, help="geçerlilik süresi (gün)")
    i.add_argument("--features", default="", help="virgülle: eFatura,uetds,gps,portal")
    i.add_argument("--instance-id", default=None, help="isteğe bağlı: yalnız License__InstanceId'si aynı olan kurulumda geçer")
    i.set_defaults(func=cmd_issue)

    v = sub.add_parser("verify", help="bir anahtarı çöz ve imzasını doğrula")
    v.add_argument("token")
    v.add_argument("--public-key", required=True)
    v.set_defaults(func=cmd_verify)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
