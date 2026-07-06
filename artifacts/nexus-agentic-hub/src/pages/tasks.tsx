import { useState } from "react";
import { useListTasks, useCreateTask, useAssignTask, useRunTask, useDeleteTask, getListTasksQueryKey, TaskStatus, TaskPriority } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ListTodo, Plus, Play, UserPlus, Trash2, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/status-badge";
import { formatDistanceToNow } from "date-fns";

const taskSchema = z.object({
  goal: z.string().min(1, "Goal is required"),
  priority: z.enum(["low", "medium", "high"]),
});

export default function Tasks() {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const { data: tasks, isLoading } = useListTasks(statusFilter !== "all" ? { status: statusFilter } : undefined);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createTask = useCreateTask();
  const assignTask = useAssignTask();
  const runTask = useRunTask();
  const deleteTask = useDeleteTask();

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: { goal: "", priority: "medium" },
  });

  const onSubmit = (values: z.infer<typeof taskSchema>) => {
    createTask.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setIsCreateOpen(false);
        form.reset();
        toast({ title: "Task created successfully" });
      },
      onError: (err: any) => {
        toast({ title: "Error creating task", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleAction = (action: "assign" | "run" | "delete", id: number) => {
    const mutation = action === "assign" ? assignTask : action === "run" ? runTask : deleteTask;
    const actionName = action === "assign" ? "Assigned" : action === "run" ? "Executed" : "Deleted";
    
    // @ts-ignore - dynamic mutation mapping
    mutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        toast({ title: `Task ${actionName} successfully` });
      },
      onError: (err: any) => {
        toast({ title: `Error running action`, description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-widest uppercase text-primary flex items-center gap-2">
            <ListTodo className="w-8 h-8" />
            Task Board
          </h1>
          <p className="text-sm font-mono text-muted-foreground mt-1">OBJECTIVE QUEUE & EXECUTION</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-none font-mono tracking-widest uppercase gap-2 border border-primary bg-primary/10 hover:bg-primary/20 text-primary">
              <Plus className="w-4 h-4" /> Inject Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-none border border-primary bg-background/95 backdrop-blur-md tech-border">
            <DialogHeader>
              <DialogTitle className="font-mono tracking-widest uppercase text-primary">Inject New Task</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs text-muted-foreground">Objective / Goal</FormLabel>
                      <FormControl>
                        <Input placeholder="Analyze Q3 dataset..." className="rounded-none border-border/50 bg-black/20 focus-visible:ring-primary focus-visible:border-primary font-mono text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs text-muted-foreground">Priority Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-none border-border/50 bg-black/20 focus:ring-primary font-mono text-sm">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-none border border-primary bg-background">
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4 border-t border-border/30">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-none font-mono uppercase text-xs border-border/50">Cancel</Button>
                  <Button type="submit" disabled={createTask.isPending} className="rounded-none font-mono uppercase text-xs gap-2">
                    {createTask.isPending ? "Injecting..." : "Submit Task"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 border-b border-border pb-4">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-2 font-mono text-xs uppercase tracking-widest overflow-x-auto pb-2 -mb-2">
          {["all", "pending", "assigned", "running", "completed", "failed"].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as TaskStatus | "all")}
              className={`px-3 py-1 border transition-colors whitespace-nowrap ${statusFilter === status ? 'border-primary text-primary bg-primary/10' : 'border-border/50 text-muted-foreground hover:bg-white/5'}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 bg-white/5 rounded-none w-full" />)}
        </div>
      ) : tasks?.length === 0 ? (
        <Card className="rounded-none border-dashed border-border/50 bg-black/10">
          <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground font-mono">
            <ListTodo className="w-8 h-8 mb-4 opacity-50" />
            <p className="uppercase tracking-widest text-sm">No tasks found for current filter</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks?.map((task) => (
            <Card key={task.id} className="rounded-none border-border bg-black/40 backdrop-blur-sm hover:border-primary/30 transition-colors">
              <div className="p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-primary font-mono text-sm tracking-widest uppercase">TSK-{task.id.toString().padStart(4, '0')}</span>
                    <StatusBadge status={task.status} />
                    <span className={`text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 border ${
                      task.priority === 'high' ? 'border-destructive text-destructive' : 
                      task.priority === 'medium' ? 'border-warning text-warning' : 
                      'border-border text-muted-foreground'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium">{task.goal}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                    <span>Added: {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
                    {task.assignedAgentId && (
                      <span className="text-primary">Agent: AGT-{task.assignedAgentId.toString().padStart(4, '0')}</span>
                    )}
                    {task.workflowId && (
                      <span>Workflow: WF-{task.workflowId.toString().padStart(4, '0')}</span>
                    )}
                  </div>
                  {task.result && (
                    <div className="mt-3 p-3 bg-black/40 border border-border/30 font-mono text-sm break-all">
                      <span className="text-green-400 block mb-1 text-[10px] uppercase tracking-widest">Result Payload</span>
                      {task.result}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-row md:flex-col justify-end gap-2 shrink-0 md:min-w-[140px]">
                  {task.status === "pending" && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="rounded-none font-mono text-xs w-full justify-start gap-2 border-primary text-primary hover:bg-primary/10"
                      onClick={() => handleAction("assign", task.id)}
                      disabled={assignTask.isPending}
                    >
                      <UserPlus className="w-3 h-3" /> Auto-Assign
                    </Button>
                  )}
                  {task.status === "assigned" && (
                    <Button 
                      size="sm" 
                      className="rounded-none font-mono text-xs w-full justify-start gap-2 bg-primary/20 text-primary hover:bg-primary/30 border border-primary"
                      onClick={() => handleAction("run", task.id)}
                      disabled={runTask.isPending}
                    >
                      <Play className="w-3 h-3" /> Execute
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="rounded-none font-mono text-xs w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Delete this task from the board?")) {
                        handleAction("delete", task.id);
                      }
                    }}
                    disabled={deleteTask.isPending}
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
