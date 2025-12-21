import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import DotPattern from '@/components/magicui/dot-pattern';
import { cn } from '@/lib/utils';
import { GetUserSubscription } from '@/server/dashutils';
import SuggestionCard from '@/components/submit/suggestion-card';

export default async function SubscriptionDashboard() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return redirect("/sign-in");
  }

  const subscription = await GetUserSubscription(session.user.id);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
        <DotPattern
            width={20}
            height={20}
            cx={1}
            cy={1}
            cr={1}
            className={cn(
            "[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)] -z-50"
            )}
        /> 

        <SuggestionCard 
            session={session}
            subscription={subscription}
        />
    </div>
  );
}
