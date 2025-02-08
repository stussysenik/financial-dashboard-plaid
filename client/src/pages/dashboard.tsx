import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Plus } from "lucide-react";
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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header with minimal controls */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold">Finance Stats</h1>
          <Button variant="ghost" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>

        {accounts.length === 0 ? (
          // Clean connect bank UI
          <Card className="p-8 text-center">
            <h2 className="text-xl font-medium mb-4">Connect Your Bank</h2>
            <p className="text-muted-foreground mb-6">
              Link your accounts to see your financial overview
            </p>
            <Button
              onClick={() => open()}
              disabled={!ready || exchangeToken.isPending}
              className="w-full sm:w-auto"
            >
              {exchangeToken.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Connect Bank
            </Button>
          </Card>
        ) : (
          // Widget-style statistics
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Total Balance Widget */}
            <Card className="p-6 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
              <h3 className="text-sm font-medium opacity-80">Total Balance</h3>
              <p className="text-3xl font-bold mt-2">
                ${totalBalance.toFixed(2)}
              </p>
            </Card>

            {/* Account Widgets */}
            {accounts.map((account: any) => (
              <Card 
                key={account.account_id} 
                className="p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-card to-muted/40"
              >
                <h3 className="text-sm font-medium text-muted-foreground">
                  {account.name}
                </h3>
                <p className="text-2xl font-semibold mt-2">
                  ${account.balances.current.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {account.subtype.replace(/_/g, ' ').toUpperCase()}
                </p>
              </Card>
            ))}

            {/* Add Account Widget */}
            <Button
              variant="outline"
              onClick={() => open()}
              disabled={!ready || exchangeToken.isPending}
              className="h-full min-h-[140px] hover:shadow-lg transition-shadow"
            >
              {exchangeToken.isPending ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Plus className="h-6 w-6" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}