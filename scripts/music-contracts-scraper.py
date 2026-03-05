#!/usr/bin/env python3
"""
Scrape contract addresses created by music NFT factory contracts using Etherscan/Polygonscan APIs.
Outputs JSON for the music indexer.

API access for Polygon (and 60+ other EVM chains) is provided through Etherscan API V2. A single
ETHERSCAN_API_KEY can be used for both Ethereum and Polygon. Set ETHERSCAN_API_KEY (and optionally
POLYGONSCAN_API_KEY if you prefer a separate key). Do not commit keys.
"""
import json
import os
import sys
import time
import warnings
from pathlib import Path

# Avoid urllib3 LibreSSL warning on macOS with system Python
warnings.filterwarnings("ignore", message="urllib3 v2 only supports OpenSSL", category=UserWarning, module="urllib3")

try:
    import requests
except ImportError:
    print("Install requests: pip install requests", file=sys.stderr)
    sys.exit(1)

FACTORY_ADDRESSES_ETH = {
    "Sound v1 Factory": "0x322813Fd9A0757951151eDe4668ec737475313e9",
    "Catalog Registry": "0x79277f2401614fF527E580A78aE79E66F78C00D6",
    "Royal Factory": "0xBd3531dA5CF5857e7CfAA92426877b022e612cf8",
    "EulerBeat Prints": "0xc7800762145300B42687118dF805663737C820f0",
}
FACTORY_ADDRESSES_POLY = {
    "Mint Songs (Legacy)": "0x37a672728D98C68E9e346F4B727404a37788478A",
}
ETHERSCAN_BASE = "https://api.etherscan.io/api"
POLYGONSCAN_BASE = "https://api.polygonscan.com/api"


def get_created_contracts_etherscan(factory_address: str, api_key: str, verbose: bool = False) -> list:
    url = f"{ETHERSCAN_BASE}?module=account&action=txlist&address={factory_address}&startblock=0&endblock=99999999&sort=asc&apikey={api_key}"
    try:
        resp = requests.get(url, timeout=30)
        data = resp.json()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return []
    status = data.get("status")
    result = data.get("result", [])
    if status != "1":
        msg = data.get("message", "Unknown error")
        err = data.get("result") if isinstance(data.get("result"), str) else msg
        print(f"Etherscan API: {msg}" + (f" — {err}" if err and err != msg else ""), file=sys.stderr)
        return []
    if verbose:
        print(f"Etherscan: {len(result)} txs for {factory_address}", file=sys.stderr)
    created = [tx.get("contractAddress").strip() for tx in result if tx.get("contractAddress") and tx.get("contractAddress").strip() and tx.get("contractAddress") != "0x"]
    return list(dict.fromkeys(created))


def get_created_contracts_polygonscan(factory_address: str, api_key: str, verbose: bool = False) -> list:
    url = f"{POLYGONSCAN_BASE}?module=account&action=txlist&address={factory_address}&startblock=0&endblock=99999999&sort=asc&apikey={api_key}"
    try:
        resp = requests.get(url, timeout=30)
        data = resp.json()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return []
    status = data.get("status")
    result = data.get("result", [])
    if status != "1":
        msg = data.get("message", "Unknown error")
        err = data.get("result") if isinstance(data.get("result"), str) else msg
        print(f"Polygonscan API: {msg}" + (f" — {err}" if err and err != msg else ""), file=sys.stderr)
        return []
    if verbose:
        print(f"Polygonscan: {len(result)} txs for {factory_address}", file=sys.stderr)
    created = [tx.get("contractAddress").strip() for tx in result if tx.get("contractAddress") and tx.get("contractAddress").strip() and tx.get("contractAddress") != "0x"]
    return list(dict.fromkeys(created))


def main():
    import argparse
    p = argparse.ArgumentParser(description="Scrape music NFT factory-created contract addresses.")
    p.add_argument("--etherscan-key", default=os.environ.get("ETHERSCAN_API_KEY"))
    p.add_argument("--polygonscan-key", default=os.environ.get("POLYGONSCAN_API_KEY"))
    p.add_argument("-o", "--output", default=None)
    p.add_argument("--eth-only", action="store_true")
    p.add_argument("--poly-only", action="store_true")
    p.add_argument("-v", "--verbose", action="store_true", help="Print API response details")
    args = p.parse_args()

    if not args.etherscan_key and not args.polygonscan_key:
        print("Set ETHERSCAN_API_KEY (or --etherscan-key). One key works for Ethereum and Polygon.", file=sys.stderr)
        sys.exit(1)

    full_registry = {}
    if not args.poly_only and FACTORY_ADDRESSES_ETH and args.etherscan_key:
        for name, address in FACTORY_ADDRESSES_ETH.items():
            full_registry[name] = get_created_contracts_etherscan(address, args.etherscan_key, verbose=args.verbose)
            print(f"Found {len(full_registry[name])} contracts for {name}")
            time.sleep(0.2)
    # Polygon: use POLYGONSCAN_API_KEY if set, else same ETHERSCAN_API_KEY (Etherscan API V2)
    poly_key = args.polygonscan_key or args.etherscan_key
    if not args.eth_only and FACTORY_ADDRESSES_POLY and poly_key:
        for name, address in FACTORY_ADDRESSES_POLY.items():
            full_registry[name] = get_created_contracts_polygonscan(address, poly_key, verbose=args.verbose)
            print(f"Found {len(full_registry[name])} contracts for {name}")
            time.sleep(0.2)

    out = args.output or Path(__file__).resolve().parent.parent / "subgraphs" / "music-indexer" / "music_contracts_registry.json"
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w") as f:
        json.dump(full_registry, f, indent=2)
    print(f"Registry saved to {out}")


if __name__ == "__main__":
    main()
