import { useState } from "react";
import { useListKnowledgeEntries, useCreateKnowledgeEntry, useDeleteKnowledgeEntry, useSearchKnowledge, getListKnowledgeEntriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Database, Plus, Search, Trash2, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const knowledgeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  tags: z.string().transform(str => str.split(',').map(s => s.trim()).filter(Boolean)),
});

export default function Knowledge() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: listData, isLoading: isListLoading } = useListKnowledgeEntries();
  const { data: searchData, isLoading: isSearchLoading } = useSearchKnowledge(
    { q: searchQuery },
    { query: { enabled: searchQuery.length > 2 } }
  );
  
  const entries = searchQuery.length > 2 ? searchData : listData;
  const isLoading = searchQuery.length > 2 ? isSearchLoading : isListLoading;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createKnowledge = useCreateKnowledgeEntry();
  const deleteKnowledge = useDeleteKnowledgeEntry();

  const form = useForm<z.infer<typeof knowledgeSchema> & { tags: string }>({
    resolver: zodResolver(z.object({
      title: z.string().min(1, "Title is required"),
      content: z.string().min(1, "Content is required"),
      tags: z.string()
    })),
    defaultValues: { title: "", content: "", tags: "" },
  });

  const onSubmit = (values: any) => {
    const formattedValues = {
      ...values,
      tags: values.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
    };
    
    createKnowledge.mutate({ data: formattedValues }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListKnowledgeEntriesQueryKey() });
        setIsCreateOpen(false);
        form.reset();
        toast({ title: "Knowledge stored in memory bank" });
      },
      onError: (err: any) => {
        toast({ title: "Storage error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-widest uppercase text-primary flex items-center gap-2">
            <Database className="w-8 h-8" />
            Knowledge Base
          </h1>
          <p className="text-sm font-mono text-muted-foreground mt-1">SHARED MEMORY BANKS</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-none font-mono tracking-widest uppercase gap-2 border border-primary bg-primary/10 hover:bg-primary/20 text-primary">
              <Plus className="w-4 h-4" /> Store Knowledge
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] rounded-none border border-primary bg-background/95 backdrop-blur-md tech-border">
            <DialogHeader>
              <DialogTitle className="font-mono tracking-widest uppercase text-primary">Store New Memory Block</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs text-muted-foreground">Index Title</FormLabel>
                      <FormControl>
                        <Input placeholder="System Architecture v2" className="rounded-none border-border/50 bg-black/20 focus-visible:ring-primary focus-visible:border-primary font-mono text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs text-muted-foreground">Payload</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Raw data or unstructured context..." className="min-h-[150px] rounded-none border-border/50 bg-black/20 focus-visible:ring-primary focus-visible:border-primary font-mono text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs text-muted-foreground">Tags (comma-separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="architecture, core, spec" className="rounded-none border-border/50 bg-black/20 focus-visible:ring-primary focus-visible:border-primary font-mono text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4 border-t border-border/30">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-none font-mono uppercase text-xs border-border/50">Cancel</Button>
                  <Button type="submit" disabled={createKnowledge.isPending} className="rounded-none font-mono uppercase text-xs gap-2">
                    {createKnowledge.isPending ? "Storing..." : "Commit Memory"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
        <Input 
          placeholder="Semantic search through memory banks..." 
          className="pl-11 h-12 rounded-none border-primary/50 bg-black/40 font-mono text-sm focus-visible:ring-primary text-primary"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery.length > 0 && searchQuery.length <= 2 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
            Type more to search
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 bg-white/5 rounded-none w-full" />)}
        </div>
      ) : entries?.length === 0 ? (
        <Card className="rounded-none border-dashed border-border/50 bg-black/10">
          <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground font-mono">
            <Database className="w-8 h-8 mb-4 opacity-50" />
            <p className="uppercase tracking-widest text-sm">No memory blocks found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {entries?.map((entry) => (
            <Card key={entry.id} className="rounded-none border-border bg-black/40 backdrop-blur-sm hover:border-primary/30 transition-colors flex flex-col">
              <CardHeader className="pb-3 border-b border-border/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-mono text-lg tracking-wider text-primary">
                    {entry.title}
                  </CardTitle>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">MEM-{entry.id.toString().padStart(4, '0')}</div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm("Purge this memory block?")) {
                      deleteKnowledge.mutate({ id: entry.id }, {
                        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListKnowledgeEntriesQueryKey() })
                      });
                    }
                  }}
                  disabled={deleteKnowledge.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col">
                <p className="text-sm font-mono text-muted-foreground whitespace-pre-wrap line-clamp-4 flex-1 mb-4">
                  {entry.content}
                </p>
                <div className="flex items-center justify-between border-t border-border/20 pt-4 mt-auto">
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 uppercase tracking-widest">
                        <Tag className="w-3 h-3" /> {tag}
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest shrink-0 ml-4">
                    {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
