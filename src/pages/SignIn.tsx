import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Avatar } from '../components/ui';
import { useApp } from '../store/app';
import { toast } from '../store/ui';

export default function SignIn() {
  const profile = useApp((s) => s.profile);
  const workspace = useApp((s) => s.workspaceName);
  const nav = useNavigate();
  return (
    <div className="grain flex min-h-screen items-center justify-center bg-[#f6f2ea] p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card w-full max-w-sm p-8 text-center">
        <Logo className="justify-center" />
        <h1 className="display mt-8 text-2xl font-semibold">You’re signed out</h1>
        <p className="mt-2 text-sm text-sand-600">Pick up where you left off in {workspace}.</p>
        <button
          onClick={() => {
            nav('/');
            toast({ tone: 'success', title: `Welcome back, ${profile.name.split(' ')[0]}` });
          }}
          className="mt-7 flex w-full items-center gap-3 rounded-xl border border-sand-200 bg-white p-3 text-left transition hover:border-ember-300 hover:shadow-card"
        >
          <Avatar name={profile.name} color="#c2410c" size={38} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Continue as {profile.name}</span>
            <span className="block truncate text-xs text-sand-500">{profile.email}</span>
          </span>
          <ArrowRight className="h-4 w-4 text-sand-400" />
        </button>
        <p className="mt-6 text-xs text-sand-500">Protected by SSO · {workspace} requires Google Workspace sign-in</p>
      </motion.div>
    </div>
  );
}
