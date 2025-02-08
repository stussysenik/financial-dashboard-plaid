import { useQuery } from "@tanstack/react-query";
import { Account, Transaction } from "@shared/schema";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from "recharts";
import { Loader2 } from "lucide-react";

interface SpendingChartProps {
  accounts: Account[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export function SpendingChart({ accounts }: SpendingChartProps) {
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

  const spendingByCategory = transactions.reduce((acc, transaction) => {
    const amount = Math.abs(Number(transaction.amount));
    acc[transaction.category] = (acc[transaction.category] || 0) + amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(spendingByCategory).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
