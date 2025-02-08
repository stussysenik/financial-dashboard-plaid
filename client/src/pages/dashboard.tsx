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
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Minimal header */}
        <Button 
          variant="ghost" 
          onClick={() => logoutMutation.mutate()}
          className="absolute top-4 right-4"
        >
          Logout
        </Button>

        {accounts.length === 0 ? (
          <Card className="p-8 text-center mt-16">
            <h2 className="text-xl font-medium mb-4">Connect Your Bank</h2>
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
          <div className="space-y-4">
            {/* Total Balance - Main Widget */}
            <Card className="p-6 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
              <h3 className="text-sm font-medium opacity-80">Total Balance</h3>
              <p className="text-4xl font-bold mt-2">
                ${totalBalance.toFixed(2)}
              </p>
            </Card>

            {/* Account Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {accounts.map((account: any) => (
                <Card 
                  key={account.account_id} 
                  className="p-6 bg-gradient-to-br from-card to-muted/40"
                >
                  <p className="text-2xl font-semibold">
                    ${account.balances.current.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {account.name}
                  </p>
                </Card>
              ))}

              {/* Add Account */}
              <Button
                variant="outline"
                onClick={() => open()}
                disabled={!ready || exchangeToken.isPending}
                className="h-[120px]"
              >
                {exchangeToken.isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Plus className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}