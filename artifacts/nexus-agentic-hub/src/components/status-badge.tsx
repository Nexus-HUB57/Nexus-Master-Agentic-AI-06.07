import { Badge } from "./ui/badge";

export function StatusBadge({ status, type = "task" }: { status: string, type?: "task" | "agent" | "workflow" }) {
  const getVariants = () => {
    switch (status.toLowerCase()) {
      case "idle":
      case "draft":
      case "pending":
        return "bg-muted text-muted-foreground border-border";
      case "assigned":
      case "busy":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "running":
        return "bg-primary/20 text-primary border-primary/30 animate-pulse";
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "failed":
      case "offline":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Badge variant="outline" className={`font-mono uppercase tracking-wider rounded-none ${getVariants()}`}>
      {status}
    </Badge>
  );
}
