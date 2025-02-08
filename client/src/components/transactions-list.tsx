import { useQuery } from "@tanstack/react-query";
import { Account, Transaction } from "@shared/schema";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface TransactionsListProps {
  accounts: Account[];
}

export function TransactionsList({ accounts }: TransactionsListProps) {
  const accountIds = accounts.map(a => a.id);
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/accounts", accountIds, "transactions"],
    enabled: accountIds.length > 0,
  });

  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin mx-auto" />;
  }

  if (!transactions?.length) {
    return <p className="text-muted-foreground text-center">No transactions found</p>;
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4">
        {transactions.map((transaction) => {
          const account = accounts.find(a => a.id === transaction.accountId);
          return (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 rounded-lg border"
            >
              <div>
                <p className="font-medium">{transaction.description}</p>
                <p className="text-sm text-muted-foreground">
                  {account?.name} • {format(new Date(transaction.date), "MMM d, yyyy")}
                </p>
              </div>
              <p className={`font-medium ${Number(transaction.amount) < 0 ? "text-red-500" : "text-green-500"}`}>
                ${Math.abs(Number(transaction.amount)).toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
