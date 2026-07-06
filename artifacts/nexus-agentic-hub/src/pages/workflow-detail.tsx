import { useGetWorkflow, useOrchestrateWorkflow, getGetWorkflowQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Route, Play, ArrowLeft, Network, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/status-badge";
import { formatDistanceToNow } from "date-fns";
import { Link, useParams } from "wouter";

export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const workflowId = parseInt(id, 10);
  const { data: workflow, isLoading } = useGetWorkflow(workflowId);
  const orchestrateWorkflow = useOrchestrateWorkflow();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleOrchestrate = () => {
    orchestrateWorkflow.mutate({ id: workflowId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWorkflowQueryKey(workflowId) });
        toast({ title: "Workflow orchestrated. Tasks decomposed and running." });
      },
      onError: (err: any) => {
        toast({ title: "Error orchestrating", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 bg-white/5 rounded-none" />
        <Skeleton className="h-40 w-full bg-white/5 rounded-none" />
        <Skeleton className="h-64 w-full bg-white/5 rounded-none" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="text-center p-12 text-muted-foreground font-mono">Workflow not found</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/workflows">
            <Button variant="ghost" size="icon" className="rounded-none border border-border/50 hover:bg-white/5">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-widest uppercase text-primary flex items-center gap-2">
              <Network className="w-6 h-6" />
              {workflow.name}
            </h1>
            <p className="text-sm font-mono text-muted-foreground mt-1">WF-{workflow.id.toString().padStart(4, '0')}</p>
          </div>
        </div>
        
        {workflow.status === 'draft' && (
          <Button 
            className="rounded-none font-mono tracking-widest uppercase gap-2 border border-primary bg-primary/10 hover:bg-primary/20 text-primary"
            onClick={handleOrchestrate}
            disabled={orchestrateWorkflow.isPending}
          >
            {orchestrateWorkflow.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} 
            {orchestrateWorkflow.isPending ? "Processing..." : "Orchestrate System"}
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 rounded-none border-border bg-black/40 backdrop-blur-sm tech-border h-fit">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-primary">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-1">Status</div>
              <StatusBadge status={workflow.status} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-1">Macro Objective</div>
              <p className="text-sm font-medium">{workflow.goal}</p>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-1">Created</div>
              <p className="text-xs font-mono text-muted-foreground uppercase">{formatDistanceToNow(new Date(workflow.createdAt), { addSuffix: true })}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 rounded-none border-border bg-black/40 backdrop-blur-sm">
          <CardHeader className="border-b border-border/50 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-primary flex items-center gap-2">
              <Route className="w-4 h-4" /> Decomposed Tasks ({workflow.tasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {workflow.tasks.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground font-mono text-sm uppercase tracking-widest">
                No tasks generated. Orchestrate workflow to decompose goal.
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {workflow.tasks.map((task, idx) => (
                  <div key={task.id} className="p-4 hover:bg-white/5 transition-colors group relative">
                    <div className="absolute left-4 top-4 bottom-4 w-px bg-border/50 hidden sm:block"></div>
                    <div className="sm:pl-6">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest bg-black/50 px-2 py-0.5 border border-border">SEQ-{idx + 1}</span>
                        <span className="text-primary font-mono text-sm tracking-widest uppercase">TSK-{task.id.toString().padStart(4, '0')}</span>
                        <StatusBadge status={task.status} />
                      </div>
                      <h4 className="text-sm font-medium mb-2">{task.goal}</h4>
                      
                      <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-3">
                        {task.assignedAgentId ? (
                          <span className="text-primary border border-primary/30 px-1">Agent: AGT-{task.assignedAgentId.toString().padStart(4, '0')}</span>
                        ) : (
                          <span className="border border-border/50 px-1">Unassigned</span>
                        )}
                        <span className={`px-1 border ${
                          task.priority === 'high' ? 'border-destructive/50 text-destructive' : 
                          task.priority === 'medium' ? 'border-warning/50 text-warning' : 
                          'border-border/50'
                        }`}>Pri: {task.priority}</span>
                      </div>
                      
                      {task.result && (
                        <div className="mt-3 p-2 bg-black/40 border-l-2 border-green-500 font-mono text-xs break-all text-muted-foreground">
                          <span className="text-green-400 block mb-1 text-[10px] uppercase tracking-widest">Result Payload</span>
                          {task.result}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
