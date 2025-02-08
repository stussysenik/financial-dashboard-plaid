import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
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
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const accounts = accountsData?.accounts || [];
  const totalBalance = accounts.reduce(
    (sum: number, account: any) => sum + account.balances.current,
    0
  );

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
        {accounts.length === 0 ? (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Connect Your Accounts</h2>
            <Button
              onClick={() => open()}
              disabled={!ready || exchangeToken.isPending}
            >
              {exchangeToken.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Link Bank Account"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="font-semibold text-muted-foreground mb-2">
                Total Balance
              </h2>
              <p className="text-3xl font-bold">
                ${totalBalance.toFixed(2)}
              </p>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account: any) => (
                <Card key={account.account_id} className="p-6">
                  <h3 className="font-semibold">{account.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {account.subtype}
                  </p>
                  <p className="text-2xl font-bold">
                    ${account.balances.current.toFixed(2)}
                  </p>
                </Card>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => open()}
              disabled={!ready || exchangeToken.isPending}
            >
              Add Another Account
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}