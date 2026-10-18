import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AlertCircle, CheckCircle, Clock, Trash2, Server, UserRound, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const RequestList = () => {
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['admin-issue-reports'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('issue_reports')
          .select('*')
          .order('created_at', { ascending: false });
        if (error || !data) return [];
        return data;
      } catch {
        return [];
      }
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('issue_reports').update({ status: 'resolved' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report marked as resolved");
      queryClient.invalidateQueries({ queryKey: ['admin-issue-reports'] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update report")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('issue_reports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report deleted");
      queryClient.invalidateQueries({ queryKey: ['admin-issue-reports'] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete report")
  });

  const handleDelete = (id: number) => {
    if (window.confirm("Delete this issue report? This cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const isResolved = (status: string) => status === 'resolved';

  const statusBadge = (status: string, small = false) => (
    <Badge variant="outline" className={isResolved(status)
      ? `border-green-500/50 text-green-400 bg-green-500/10${small ? ' text-[8px] py-0.5' : ''}`
      : `border-amber-500/50 text-amber-400 bg-amber-500/10${small ? ' text-[8px] py-0.5' : ''}`}
    >
      {isResolved(status) ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
      {status}
    </Badge>
  );

  const rowActions = (r: any) => (
    <div className="flex items-center justify-end gap-1.5">
      {!isResolved(r.status) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-[10px] font-bold text-green-400 hover:text-green-300 hover:bg-green-500/10 cursor-pointer"
          disabled={resolveMutation.isPending}
          onClick={() => resolveMutation.mutate(r.id)}
        >
          <CheckCircle className="w-3 h-3 mr-1" /> Mark Resolved
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
        disabled={deleteMutation.isPending}
        onClick={() => handleDelete(r.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Issue Reports</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Playback issues reported by viewers from the player's "Report Broken Server / Audio" menu.</p>
      </div>

      <div className="bg-[#11111a] border border-white/5 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500 text-xs italic">
            Loading issue reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-bold text-zinc-400">No issue reports yet</p>
            <p className="text-xs text-zinc-600">
              Reports submitted via the player's "Report" menu will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left text-muted-foreground">
                <thead className="text-xs text-muted-foreground uppercase bg-white/5">
                  <tr>
                    <th className="px-6 py-4 font-medium">Episode</th>
                    <th className="px-6 py-4 font-medium">Server</th>
                    <th className="px-6 py-4 font-medium">Reason</th>
                    <th className="px-6 py-4 font-medium">Reported By</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {reports.map((r: any) => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-primary">
                        #{r.episode_id ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                          <Server className="w-3 h-3 text-muted-foreground" />
                          {r.server_name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">
                        {r.reason || '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 font-mono">
                          <UserRound className="w-3 h-3" />
                          {r.user_id ? `${String(r.user_id).slice(0, 8)}...` : 'Anonymous'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        {statusBadge(r.status || 'pending')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {rowActions(r)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List View */}
            <div className="block md:hidden divide-y divide-white/5">
              {reports.map((r: any) => (
                <div key={r.id} className="p-4 space-y-2.5 hover:bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-left">
                      <span className="font-extrabold text-xs text-white block truncate">
                        {r.reason || 'Issue report'}
                      </span>
                      <span className="text-[10px] text-zinc-500 block truncate leading-none mt-1">
                        <Server className="w-2.5 h-2.5 inline mr-1" />
                        {r.server_name || 'Unknown'} • Ep #{r.episode_id ?? '—'} • {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <div className="shrink-0">
                      {statusBadge(r.status || 'pending', true)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <span className="text-[9px] text-zinc-600 font-mono flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5" />
                      {r.user_id ? `${String(r.user_id).slice(0, 8)}...` : 'Anonymous'}
                    </span>
                    {rowActions(r)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RequestList;