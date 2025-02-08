import { useQuery } from "@tanstack/react-query";
import { Account, Transaction } from "@shared/schema";
import { AccountCard } from "@/components/account-card";
import { TransactionsList } from "@/components/transactions-list";
import { SpendingChart } from "@/components/spending-chart";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { logoutMutation } = useAuth();
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  if (isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const totalBalance = accounts?.reduce((sum, account) => sum + Number(account.balance), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Financial Dashboard</h1>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="p-6">
            <h2 className="font-semibold text-muted-foreground mb-2">Total Balance</h2>
            <p className="text-3xl font-bold">${totalBalance.toFixed(2)}</p>
          </Card>
          
          {accounts?.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Spending Overview</h2>
            <SpendingChart accounts={accounts || []} />
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
            <TransactionsList accounts={accounts || []} />
          </Card>
        </div>
      </main>
    </div>
  );
}
