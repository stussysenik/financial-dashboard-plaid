import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { usePlaidLink } from "react-plaid-link";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { SpendingSummary } from "@/components/spending-summary";

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
  const { data: institutionsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["/api/plaid/accounts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/plaid/accounts");
      return res.json();
    },
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
    return <LoadingSpinner />;
  }

  const institutions = institutionsData?.institutions || [];
  const totalBalance = institutions.reduce((sum, institution) => {
    return sum + institution.accounts.reduce(
      (iSum: number, account: any) => iSum + account.balances.current,
      0
    );
  }, 0);

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Button 
          variant="ghost" 
          onClick={() => logoutMutation.mutate()}
          className="absolute top-4 right-4"
        >
          Logout
        </Button>

        {/* Total Balance */}
        <Card className="p-6 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
          <h3 className="text-sm font-medium opacity-80">Total Balance</h3>
          <p className="text-4xl font-bold mt-2">
            ${totalBalance.toFixed(2)}
          </p>
        </Card>

        {/* Spending Summary */}
        <SpendingSummary />

        {/* Institutions */}
        <div className="space-y-8">
          {institutions.map((institution: any) => (
            <div key={institution.institution} className="space-y-4">
              <h2 className="text-xl font-semibold">{institution.institution}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {institution.accounts.map((account: any) => (
                  <AccountCard
                    key={account.account_id}
                    account={account}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Add Account Button */}
          <Button
            onClick={() => open()}
            disabled={!ready || exchangeToken.isPending}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Bank
          </Button>
        </div>
      </div>
    </div>
  );
}