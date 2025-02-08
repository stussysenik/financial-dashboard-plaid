import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, CreditCard, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { usePlaidLink } from "react-plaid-link";

export default function Dashboard() {
  const { logoutMutation } = useAuth();
  const { toast } = useToast();

  // Get link token for Plaid Link
  const { data: linkToken, isLoading: isLoadingLink } = useQuery({
    queryKey: ["/api/plaid/create-link-token"],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/plaid/create-link-token");
      return res.json();
    },
  });

  // Get connected accounts
  const { data: accountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["/api/plaid/accounts"],
  });

  // Handle exchanging public token
  const exchangeToken = useMutation({
    mutationFn: async (publicToken: string) => {
      await apiRequest("POST", "/api/plaid/set-access-token", {
        public_token: publicToken,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plaid/accounts"] });
      toast({
        title: "Account connected",
        description: "Your accounts have been successfully linked.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { open, ready } = usePlaidLink({
    token: linkToken?.link_token,
    onSuccess: (public_token) => {
      exchangeToken.mutate(public_token);
    },
  });

  if (isLoadingLink || isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const accounts = accountsData?.accounts || [];
  const totalBalance = accounts.reduce(
    (sum: number, account: any) => sum + account.balances.current,
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 h-16 flex justify-between items-center">
          <h1 className="text-lg font-semibold md:text-xl">Financial Overview</h1>
          <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-5xl">
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
            <div className="p-4 rounded-full bg-primary/10">
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-center">Connect Your Accounts</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Link your bank accounts to start tracking your spending across all your cards.
            </p>
            <Button
              onClick={() => open()}
              disabled={!ready || exchangeToken.isPending}
              className="mt-4"
            >
              {exchangeToken.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Link Bank Account
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-6">
            <Card className="p-6 bg-primary text-primary-foreground">
              <h2 className="text-sm font-medium opacity-90">Total Balance</h2>
              <p className="text-3xl font-bold mt-1">
                ${totalBalance.toFixed(2)}
              </p>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account: any) => (
                <Card 
                  key={account.account_id} 
                  className="p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col h-full">
                    <h3 className="font-medium line-clamp-1">{account.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {account.subtype.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    <p className="text-2xl font-semibold mt-auto">
                      ${account.balances.current.toFixed(2)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => open()}
              disabled={!ready || exchangeToken.isPending}
              className="w-full sm:w-auto"
            >
              {exchangeToken.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Another Account
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}