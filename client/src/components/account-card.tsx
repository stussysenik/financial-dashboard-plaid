import { Card } from "@/components/ui/card";
import { Account } from "@shared/schema";
import { SiDiscover, SiAmericanexpress, SiVisa, SiMastercard } from "react-icons/si";

interface AccountCardProps {
  account: Account;
}

const getCardIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "discover":
      return <SiDiscover className="h-8 w-8" />;
    case "amex":
      return <SiAmericanexpress className="h-8 w-8" />;
    case "visa":
      return <SiVisa className="h-8 w-8" />;
    case "mastercard":
      return <SiMastercard className="h-8 w-8" />;
    default:
      return null;
  }
};

export function AccountCard({ account }: AccountCardProps) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold">{account.name}</h3>
          <p className="text-sm text-muted-foreground">{account.type}</p>
        </div>
        {getCardIcon(account.type)}
      </div>
      <p className="text-2xl font-bold">${Number(account.balance).toFixed(2)}</p>
    </Card>
  );
}
