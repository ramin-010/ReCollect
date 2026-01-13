'use client';

import React, { useEffect, useState } from 'react';
import axios from '@/lib/utils/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui-base/Button';
import { Check, X, Clock, User, FileText, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AccessRequest {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  doc: {
    _id: string;
    title: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  role: 'editor' | 'viewer';
  requestedAt: string;
}

export function PendingRequestsPanel() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/docs/pending-requests');
      if (response.data.success) {
        setRequests(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (docId: string, reqId: string) => {
    try {
      setProcessingId(reqId);
      const response = await axios.post(`/api/docs/${docId}/requests/${reqId}/approve`);
      if (response.data.success) {
        toast.success('Access granted!');
        setRequests(prev => prev.filter(r => r._id !== reqId));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (docId: string, reqId: string) => {
    try {
      setProcessingId(reqId);
      const response = await axios.post(`/api/docs/${docId}/requests/${reqId}/reject`);
      if (response.data.success) {
        toast.success('Request rejected');
        setRequests(prev => prev.filter(r => r._id !== reqId));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-[hsl(var(--muted))]/50 rounded-full flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
        </div>
        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">No Pending Requests</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          When someone requests access to your documents, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
          Pending Requests ({requests.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchRequests}
          className="text-[hsl(var(--muted-foreground))]"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <AnimatePresence>
        {requests.map((request) => (
          <motion.div
            key={request._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="p-4 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm"
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {request.user.avatar ? (
                  <img 
                    src={request.user.avatar} 
                    alt={request.user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-amber-500" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[hsl(var(--foreground))]">
                    {request.user.name}
                  </span>
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {request.user.email}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  <FileText className="w-4 h-4" />
                  <span className="truncate">{request.doc.title}</span>
                  <span className="px-2 py-0.5 bg-[hsl(var(--muted))]/50 rounded text-xs capitalize">
                    {request.role}
                  </span>
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  Requested {new Date(request.requestedAt).toLocaleDateString()}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReject(request.doc._id, request._id)}
                  disabled={processingId === request._id}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(request.doc._id, request._id)}
                  isLoading={processingId === request._id}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
