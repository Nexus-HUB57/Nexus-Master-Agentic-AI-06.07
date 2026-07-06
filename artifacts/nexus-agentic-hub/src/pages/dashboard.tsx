import { useGetDashboardSummary, useListActivityEvents } from "@workspace/api-client-react";
import { Activity, BrainCircuit, CheckCircle2, ListTodo, Route, Users, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: events, isLoading: isEventsLoading } = useListActivityEvents({ limit: 10 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-widest uppercase text-primary">Mission Control</h1>
        <p className="text-sm font-mono text-muted-foreground">SYSTEM OVERVIEW & ACTIVE METRICS</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Active Agents" 
          value={summary ? `${summary.activeAgents} / ${summary.totalAgents}` : null}
          icon={Users}
          isLoading={isSummaryLoading}
        />
        <MetricCard 
          title="Total Tasks" 
          value={summary?.totalTasks.toString()}
          icon={ListTodo}
          isLoading={isSummaryLoading}
        />
        <MetricCard 
          title="Running Workflows" 
          value={summary?.runningWorkflows.toString()}
          icon={Route}
          isLoading={isSummaryLoading}
        />
        <MetricCard 
          title="Knowledge Entries" 
          value={summary?.totalKnowledgeEntries.toString()}
          icon={BrainCircuit}
          isLoading={isSummaryLoading}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 rounded-none border-border bg-black/40 backdrop-blur-sm tech-border">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg font-mono uppercase tracking-wider text-primary flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isEventsLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-12 w-full bg-white/5 rounded-none" />
                <Skeleton className="h-12 w-full bg-white/5 rounded-none" />
                <Skeleton className="h-12 w-full bg-white/5 rounded-none" />
              </div>
            ) : events?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-mono">No recent activity</div>
            ) : (
              <div className="divide-y divide-border/30">
                {events?.map((event) => (
                  <div key={event.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getEventIcon(event.kind)}</div>
                      <div>
                        <p className="text-sm font-medium">{event.message}</p>
                        <p className="text-xs font-mono text-muted-foreground mt-1">
                          {event.kind.replace('_', ' ').toUpperCase()} 
                          {event.agentId && ` • AGENT-${event.agentId}`}
                          {event.taskId && ` • TASK-${event.taskId}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="col-span-3 space-y-6">
          <Card className="rounded-none border-border bg-black/40 backdrop-blur-sm">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-sm font-mono uppercase tracking-wider text-primary">Top Agents</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {isSummaryLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full bg-white/5 rounded-none" />
                  <Skeleton className="h-10 w-full bg-white/5 rounded-none" />
                </div>
              ) : summary?.topAgents.length === 0 ? (
                <div className="text-center text-muted-foreground font-mono text-sm py-4">No active agents</div>
              ) : (
                <div className="space-y-4">
                  {summary?.topAgents.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between border border-border/50 bg-black/20 p-3">
                      <div>
                        <div className="font-mono font-bold">{agent.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{agent.skillType}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-primary font-mono text-lg">{agent.trustScore}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Trust</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-none border-border bg-black/40 backdrop-blur-sm">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-sm font-mono uppercase tracking-wider text-primary">Task Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {isSummaryLoading ? (
                <Skeleton className="h-32 w-full bg-white/5 rounded-none" />
              ) : (
                <div className="space-y-3">
                  {summary?.tasksByStatus.map((stat) => (
                    <div key={stat.status} className="flex items-center justify-between">
                      <StatusBadge status={stat.status} />
                      <span className="font-mono text-lg">{stat.count}</span>
                    </div>
                  ))}
                  {summary?.tasksByStatus.length === 0 && (
                    <div className="text-center text-muted-foreground font-mono text-sm py-4">No tasks tracked</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, isLoading }: { title: string, value?: string | null, icon: any, isLoading: boolean }) {
  return (
    <Card className="rounded-none border-border bg-black/40 backdrop-blur-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-16 h-16 text-primary" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20 bg-white/10 rounded-none" />
        ) : (
          <div className="text-3xl font-bold tracking-wider font-mono text-foreground">{value || "0"}</div>
        )}
      </CardContent>
    </Card>
  );
}

function getEventIcon(kind: string) {
  if (kind.includes('fail') || kind.includes('error')) return <XCircle className="w-4 h-4 text-destructive" />;
  if (kind.includes('complete') || kind.includes('success')) return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (kind.includes('run') || kind.includes('assign')) return <Activity className="w-4 h-4 text-primary animate-pulse" />;
  return <div className="w-2 h-2 mt-1 rounded-full bg-blue-400" />;
}
