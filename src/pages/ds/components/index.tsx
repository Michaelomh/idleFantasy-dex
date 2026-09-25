import { useState, type ReactNode } from 'react';
import { FlaskConical, Gauge, Link2Off, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';

import { Badge, type BadgeVariant } from '@/components/badge';
import { Banner } from '@/components/banner';
import { FloatingNavBar } from '@/components/floating-nav-bar';
import { GoalCard } from '@/components/goal-card';
import { GoalDetailHeader, TopStatusBar } from '@/components/headers';
import { SkillRow } from '@/components/skill-row';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const NAV_ITEMS = [
  { label: 'Progress', icon: <Gauge className="size-5" /> },
  { label: 'Forecast', icon: <TrendingUp className="size-5" /> },
  { label: 'Simulate', icon: <FlaskConical className="size-5" /> },
];

export function Component() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <header className="mb-10">
        <Link to="/" className="label text-primary">
          ← back
        </Link>
        <h1 className="h1 mt-2">Design system components</h1>
        <p className="body mt-1">
          Every component from the design-system build, rendered with fixture props - not screenshots, not real save
          data.
        </p>
      </header>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="text">Text</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="destructive-text">Destructive Text</Button>
        </div>
      </Section>

      <Section title="Progress">
        <div className="flex max-w-sm flex-col gap-3">
          <Progress value={25} max={100} />
          <Progress value={75} max={100} />
          <Progress value={100} max={100} complete />
        </div>
      </Section>

      <Section title="Sheet">
        <Sheet>
          <SheetTrigger render={<Button variant="secondary" />}>Open sheet</SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>This export is older than your saved data</SheetTitle>
              <SheetDescription>Saved: 2h ago · This file: 3d ago</SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <Button variant="primary">Keep current</Button>
              <Button variant="text">Use the older file anyway</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap items-start gap-3">
          {(['kill-tracking', 'item-tracking', 'version-unknown'] as BadgeVariant[]).map((variant) => (
            <Badge key={variant} variant={variant} onClick={() => {}} />
          ))}
        </div>
      </Section>

      <Section title="Goal card">
        <div className="flex max-w-sm flex-col gap-3">
          <GoalCard name="Quests" current={142} total={189} onClick={() => {}} />
          <GoalCard name="Armoury" current={358} total={358} onClick={() => {}} />
          <GoalCard name="Guilds" current={20} total={200} onClick={() => {}} />
        </div>
      </Section>

      <Section title="Banner">
        <div className="flex max-w-sm flex-col gap-3">
          <Banner
            tone="stale"
            title="Save is 3 days old"
            description="These numbers can differ from your game."
            action={
              <Button variant="primary" onClick={() => {}}>
                Sync now
              </Button>
            }
          />
          <Banner
            tone="aging"
            icon={<Link2Off className="size-4 shrink-0 text-aging" />}
            title="Reconnect your backup folder to refresh."
            action={
              <Button variant="text" className="h-auto px-0" onClick={() => {}}>
                Reconnect
              </Button>
            }
          />
        </div>
      </Section>

      <Section title="Headers">
        <div className="flex max-w-sm flex-col gap-3">
          <div>
            <div className="label mb-2 text-muted-foreground">Top status bar - single slot</div>
            <TopStatusBar characterName="Kyrasoar" onRefresh={() => {}} onSettings={() => {}} />
          </div>
          <div>
            <div className="label mb-2 text-muted-foreground">Top status bar - multiple slots</div>
            <TopStatusBar
              characterName="Kyrasoar"
              hasMultipleSlots
              onCharacterClick={() => {}}
              onRefresh={() => {}}
              onSettings={() => {}}
            />
          </div>
          <div>
            <div className="label mb-2 text-muted-foreground">Top status bar - manual-upload-only</div>
            <TopStatusBar characterName="Kyrasoar" manualUploadOnly onLoad={() => {}} onSettings={() => {}} />
          </div>
          <div>
            <div className="label mb-2 text-muted-foreground">Goal detail sub-header</div>
            <GoalDetailHeader goalName="Quests" current={142} total={189} onBack={() => {}} />
          </div>
        </div>
      </Section>

      <Section title="Skill row">
        <div className="flex max-w-sm flex-col">
          <SkillRow skillName="Fishing" meta="2.1M XP TO 99" percent={70} kind="level" level={84} nearCap />
          <SkillRow skillName="Mining" meta="14.4M XP TO 99" percent={20} kind="level" level={61} />
          <SkillRow skillName="Agility" meta="1 / 3 STARS" percent={33} kind="prestige" />
        </div>
      </Section>

      <Section title="Floating nav bar">
        <p className="body mb-4">
          Not part of v1 - reserves the roadmap's future V2/V3 tab bar ({'Progress / Forecast / Simulate'}). Fixed to
          the viewport, so it renders at the bottom of this whole page rather than inline.
        </p>
        <FloatingNavBar items={NAV_ITEMS} activeIndex={activeTab} onChange={setActiveTab} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="h2 mb-4">{title}</h2>
      {children}
    </section>
  );
}
