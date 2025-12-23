"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { meTokenSupabaseService, MeTokenTransaction } from '@/lib/sdk/supabase/metokens';
import { MeTokenData } from '@/lib/hooks/metokens/useMeTokensSupabase';
import { Loader2, ExternalLink, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react';
import { formatEther } from 'viem';
import { Button } from '@/components/ui/button';

interface MeTokenHistoryProps {
    meToken: MeTokenData;
}

export function MeTokenHistory({ meToken }: MeTokenHistoryProps) {
    const [transactions, setTransactions] = useState<MeTokenTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                setLoading(true);
                // Fetch last 50 transactions
                const data = await meTokenSupabaseService.getMeTokenTransactions(meToken.address, { limit: 50 });
                setTransactions(data);
            } catch (err) {
                console.error('Failed to fetch transactions:', err);
                setError('Failed to load transaction history');
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchTransactions, 30000);
        return () => clearInterval(interval);
    }, [meToken.address]);

    const getExplorerLink = (hash: string) => {
        return `https://basescan.org/tx/${hash}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    if (loading && transactions.length === 0) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span>Transaction History</span>
                </CardTitle>
                <CardDescription>
                    Recent activity for {meToken.symbol}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error ? (
                    <div className="text-center py-4 text-red-500">{error}</div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No transactions found yet.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-md border">
                            <div className="relative w-full overflow-auto">
                                <table className="w-full caption-bottom text-sm text-left">
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Type</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Amount</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Value</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Time</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Link</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {transactions.map((tx) => (
                                            <tr key={tx.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                                <td className="p-4 align-middle font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {tx.transaction_type === 'mint' && <ArrowDownLeft className="h-4 w-4 text-green-500" />}
                                                        {tx.transaction_type === 'burn' && <ArrowUpRight className="h-4 w-4 text-red-500" />}
                                                        {tx.transaction_type === 'create' && <Plus className="h-4 w-4 text-blue-500" />}
                                                        <span>
                                                            {tx.transaction_type === 'mint' ? 'Buy' : tx.transaction_type === 'burn' ? 'Sell' : tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    {tx.transaction_type === 'mint' || tx.transaction_type === 'burn' ? (
                                                        <span>{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {meToken.symbol}</span>
                                                    ) : (
                                                        <span>-</span>
                                                    )}
                                                </td>
                                                <td className="p-4 align-middle">
                                                    {tx.collateral_amount ? (
                                                        <span>{tx.collateral_amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} DAI</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                                <td className="p-4 align-middle text-muted-foreground">
                                                    {formatDate(tx.created_at)}
                                                </td>
                                                <td className="p-4 align-middle text-right">
                                                    {tx.transaction_hash && (
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <a
                                                                href={getExplorerLink(tx.transaction_hash)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                title="View on Block Explorer"
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="text-xs text-center text-muted-foreground">
                            Showing last {transactions.length} transactions
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
