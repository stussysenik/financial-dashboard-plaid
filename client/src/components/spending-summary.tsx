import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PlaidTransaction, PlaidInstitution } from "@shared/schema";

interface SpendingByCategory {
  [category: string]: number;
}

export function SpendingSummary() {
  const { data, isLoading } = useQuery<{ institutions: PlaidInstitution[] }>({
    queryKey: ["/api/plaid/transactions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/plaid/transactions");
      return res.json();
    },
  });

  if (isLoading) return <LoadingSpinner />;

  const institutions = data?.institutions || [];
  const totalSpent = institutions.reduce((total: number, inst: PlaidInstitution) => {
    return total + inst.transactions.reduce((sum: number, tx: PlaidTransaction) => {
      // Only count spending (negative amounts)
      return tx.amount < 0 ? sum + Math.abs(tx.amount) : sum;
    }, 0);
  }, 0);

  // Group transactions by category
  const spendingByCategory = institutions.reduce((acc: SpendingByCategory, inst: PlaidInstitution) => {
    inst.transactions
      .filter((tx: PlaidTransaction) => tx.amount < 0) // Only spending
      .forEach((tx: PlaidTransaction) => {
        const category = tx.category?.[0] || 'Other';
        acc[category] = (acc[category] || 0) + Math.abs(tx.amount);
      });
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">30-Day Spending Summary</h3>
        <p className="text-3xl font-bold text-primary">
          ${totalSpent.toFixed(2)}
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(spendingByCategory)
          .sort(([, a], [, b]) => b - a) // Sort by amount
          .slice(0, 6) // Top 6 categories
          .map(([category, amount]) => (
            <Card key={category} className="p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">{category}</span>
                <span className="text-muted-foreground">
                  ${amount.toFixed(2)}
                </span>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
} 