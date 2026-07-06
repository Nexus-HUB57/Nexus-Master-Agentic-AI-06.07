import { useState } from "react";
import { useListWorkflows, useCreateWorkflow, useDeleteWorkflow, useOrchestrateWorkflow, getListWorkflowsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Route, Plus, Trash2, ArrowRight, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/status-badge";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

const workflowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  goal: z.string().min(1, "Goal is required"),
});

export default function Workflows() {
  const { data: workflows, isLoading } = useListWorkflows();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createWorkflow = useCreateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const orchestrateWorkflow = useOrchestrateWorkflow();

  const form = useForm<z.infer<typeof workflowSchema>>({
    resolver: zodResolver(workflowSchema),
    defaultValues: { name: "", goal: "" },
  });

  const onSubmit = (values: z.infer<typeof workflowSchema>) => {
    createWorkflow.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWorkflowsQueryKey() });
        setIsCreateOpen(false);
        form.reset();
        toast({ title: "Workflow compiled successfully" });
      },
      onError: (err: any) => {
        toast({ title: "Error compiling workflow", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleOrchestrate = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    orchestrateWorkflow.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWorkflowsQueryKey() });
        toast({ title: "Workflow orchestrated. Tasks decomposed and running." });
      },
      onError: (err: any) => {
        toast({ title: "Error orchestrating", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Terminate and delete this workflow?")) {
      deleteWorkflow.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWorkflowsQueryKey() });
          toast({ title: "Workflow terminated." });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-widest uppercase text-primary flex items-center gap-2">
            <Route className="w-8 h-8" />
            Workflows
          </h1>
          <p className="text-sm font-mono text-muted-foreground mt-1">COMPLEX GOAL DECOMPOSITION</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-none font-mono tracking-widest uppercase gap-2 border border-primary bg-primary/10 hover:bg-primary/20 text-primary">
              <Plus className="w-4 h-4" /> Compile Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-none border border-primary bg-background/95 backdrop-blur-md tech-border">
            <DialogHeader>
              <DialogTitle className="font-mono tracking-widest uppercase text-primary">Compile New Workflow</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs text-muted-foreground">Designation</FormLabel>
                      <FormControl>
                        <Input placeholder="Market Analysis Beta" className="rounded-none border-border/50 bg-black/20 focus-visible:ring-primary focus-visible:border-primary font-mono text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs text-muted-foreground">Macro Objective</FormLabel>
                      <FormControl>
                        <Input placeholder="Analyze competitor pricing and generate report" className="rounded-none border-border/50 bg-black/20 focus-visible:ring-primary focus-visible:border-primary font-mono text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4 border-t border-border/30">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-none font-mono uppercase text-xs border-border/50">Cancel</Button>
                  <Button type="submit" disabled={createWorkflow.isPending} className="rounded-none font-mono uppercase text-xs gap-2">
                    {createWorkflow.isPending ? "Compiling..." : "Initialize"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 bg-white/5 rounded-none w-full" />)}
        </div>
      ) : workflows?.length === 0 ? (
        <Card className="rounded-none border-dashed border-border/50 bg-black/10">
          <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground font-mono">
            <Route className="w-8 h-8 mb-4 opacity-50" />
            <p className="uppercase tracking-widest text-sm">No workflows active</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {workflows?.map((workflow) => (
            <Link key={workflow.id} href={`/workflows/${workflow.id}`} className="block focus:outline-none">
              <Card className="rounded-none border-border bg-black/40 backdrop-blur-sm hover:border-primary/50 transition-colors group h-full flex flex-col cursor-pointer">
                <CardHeader className="pb-3 border-b border-border/20 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="font-mono text-lg tracking-wider text-primary group-hover:glitch-text transition-all">
                      {workflow.name}
                    </CardTitle>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">ID: WF-{workflow.id.toString().padStart(4, '0')}</div>
                  </div>
                  <StatusBadge status={workflow.status} />
                </CardHeader>
                <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-1">Macro Objective</div>
                    <p className="text-sm font-medium line-clamp-2">{workflow.goal}</p>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-border/20 pt-4">
                    <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                      {formatDistanceToNow(new Date(workflow.createdAt), { addSuffix: true })}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {workflow.status === 'draft' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 rounded-none font-mono text-xs border border-primary/30 text-primary hover:bg-primary/20 z-10"
                          onClick={(e) => handleOrchestrate(workflow.id, e)}
                          disabled={orchestrateWorkflow.isPending}
                        >
                          <Play className="w-3 h-3 mr-2" /> Orchestrate
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
                        onClick={(e) => handleDelete(workflow.id, e)}
                        disabled={deleteWorkflow.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-none text-muted-foreground group-hover:text-primary z-10" asChild>
                        <span><ArrowRight className="w-4 h-4" /></span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
