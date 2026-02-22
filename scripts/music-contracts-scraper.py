#!/usr/bin/env python3
"""
Scrape contract addresses created by music NFT factory contracts using Etherscan/Polygonscan APIs.
Outputs JSON for the music indexer. Set ETHERSCAN_API_KEY and/or POLYGONSCAN_API_KEY (do not commit).
"""
import json
import os
import sys
import time
from pathlib import Path

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


def get_created_contracts_etherscan(factory_address: str, api_key: str) -> list:
    url = f"{ETHERSCAN_BASE}?module=account&action=txlist&address={factory_address}&startblock=0&endblock=99999999&sort=asc&apikey={api_key}"
    try:
        resp = requests.get(url, timeout=30)
        data = resp.json()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return []
    if data.get("status") != "1":
        return []
    created = [tx.get("contractAddress").strip() for tx in data.get("result", []) if tx.get("contractAddress") and tx.get("contractAddress") != "0x"]
    return list(dict.fromkeys(created))


def get_created_contracts_polygonscan(factory_address: str, api_key: str) -> list:
    url = f"{POLYGONSCAN_BASE}?module=account&action=txlist&address={factory_address}&startblock=0&endblock=99999999&sort=asc&apikey={api_key}"
    try:
        resp = requests.get(url, timeout=30)
        data = resp.json()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return []
    if data.get("status") != "1":
        return []
    created = [tx.get("contractAddress").strip() for tx in data.get("result", []) if tx.get("contractAddress") and tx.get("contractAddress") != "0x"]
    return list(dict.fromkeys(created))


def main():
    import argparse
    p = argparse.ArgumentParser(description="Scrape music NFT factory-created contract addresses.")
    p.add_argument("--etherscan-key", default=os.environ.get("ETHERSCAN_API_KEY"))
    p.add_argument("--polygonscan-key", default=os.environ.get("POLYGONSCAN_API_KEY"))
    p.add_argument("-o", "--output", default=None)
    p.add_argument("--eth-only", action="store_true")
    p.add_argument("--poly-only", action="store_true")
    args = p.parse_args()

    full_registry = {}
    if not args.poly_only and FACTORY_ADDRESSES_ETH and args.etherscan_key:
        for name, address in FACTORY_ADDRESSES_ETH.items():
            full_registry[name] = get_created_contracts_etherscan(address, args.etherscan_key)
            print(f"Found {len(full_registry[name])} contracts for {name}")
            time.sleep(0.2)
    if not args.eth_only and FACTORY_ADDRESSES_POLY and args.polygonscan_key:
        for name, address in FACTORY_ADDRESSES_POLY.items():
            full_registry[name] = get_created_contracts_polygonscan(address, args.polygonscan_key)
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
