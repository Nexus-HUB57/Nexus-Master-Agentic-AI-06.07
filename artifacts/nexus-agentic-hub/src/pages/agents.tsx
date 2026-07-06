import { useListAgents, useCreateAgent, useDeleteAgent, useUpdateAgent, getListAgentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, Plus, Search, Trash2, Edit2, Activity, ServerOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/status-badge";

const agentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  skillType: z.string().min(1, "Skill type is required"),
});

export default function Agents() {
  const { data: agents, isLoading } = useListAgents();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createAgent = useCreateAgent();
  const deleteAgent = useDeleteAgent();

  const form = useForm<z.infer<typeof agentSchema>>({
    resolver: zodResolver(agentSchema),
    defaultValues: { name: "", skillType: "" },
  });

  const onSubmit = (values: z.infer<typeof agentSchema>) => {
    createAgent.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        setIsCreateOpen(false);
        form.reset();
        toast({ title: "Agent registered successfully" });
      },
      onError: (err: any) => {
        toast({ title: "Error registering agent", description: err.message, variant: "destructive" });
      }
    });
  };

  const filteredAgents = agents?.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.skillType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-widest uppercase text-primary flex items-center gap-2">
            <BrainCircuit className="w-8 h-8" />
            Agent Registry
          </h1>
          <p className="text-sm font-mono text-muted-foreground mt-1">FLEET MONITORING & PROVISIONING</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-none font-mono tracking-widest uppercase gap-2 border border-primary">
              <Plus className="w-4 h-4" /> Provision Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-none border border-primary bg-background/95 backdrop-blur-md tech-border">
            <DialogHeader>
              <DialogTitle className="font-mono tracking-widest uppercase text-primary">Provision New Agent</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs text-muted-foreground">Callsign</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. AXIS-1" className="rounded-none border-border/50 bg-black/20 focus-visible:ring-primary focus-visible:border-primary font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="skillType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs text-muted-foreground">Primary Skill</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-none border-border/50 bg-black/20 focus:ring-primary font-mono text-sm">
                            <SelectValue placeholder="Select classification" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-none border border-primary bg-background">
                          <SelectItem value="research">Research</SelectItem>
                          <SelectItem value="code">Code & Logic</SelectItem>
                          <SelectItem value="data-analysis">Data Analysis</SelectItem>
                          <SelectItem value="orchestration">Orchestration</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4 border-t border-border/30">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-none font-mono uppercase text-xs border-border/50">Cancel</Button>
                  <Button type="submit" disabled={createAgent.isPending} className="rounded-none font-mono uppercase text-xs gap-2">
                    {createAgent.isPending ? "Provisioning..." : "Initialize"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search agents by callsign or skill..." 
            className="pl-9 rounded-none border-border bg-black/20 font-mono text-sm focus-visible:ring-primary"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 bg-white/5 rounded-none" />)}
        </div>
      ) : filteredAgents?.length === 0 ? (
        <Card className="rounded-none border-dashed border-border/50 bg-black/10">
          <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground font-mono">
            <ServerOff className="w-8 h-8 mb-4 opacity-50" />
            <p className="uppercase tracking-widest text-sm">No agents found in registry</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAgents?.map((agent) => (
            <Card key={agent.id} className="rounded-none border-border bg-black/40 backdrop-blur-sm hud-panel hover:border-primary/50 transition-colors group">
              <CardHeader className="pb-3 border-b border-border/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-mono text-lg tracking-wider text-primary group-hover:glitch-text transition-all">
                    {agent.name}
                  </CardTitle>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">ID: AGT-{agent.id.toString().padStart(4, '0')}</div>
                </div>
                <StatusBadge status={agent.status} />
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-1">Classification</div>
                    <div className="text-sm font-mono bg-white/5 inline-block px-2 py-1 border border-border/30">{agent.skillType}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-1">Trust Score</div>
                    <div className="text-lg font-mono text-primary font-bold">{agent.trustScore}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs font-mono border-t border-border/20 pt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TASKS DONE</span>
                    <span className="text-green-400">{agent.tasksCompleted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FAILED</span>
                    <span className="text-destructive">{agent.tasksFailed}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-8 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => {
                    if (confirm("Are you sure you want to decommission this agent?")) {
                      deleteAgent.mutate({ id: agent.id }, {
                        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() })
                      });
                    }
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
