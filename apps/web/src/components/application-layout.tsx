'use client'

import {
  Avatar,
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  Navbar,
  NavbarItem,
  NavbarSection,
  NavbarSpacer,
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
  SidebarLayout
} from '@sqc/ui-catalyst'
import { usePathname } from 'next/navigation'
import { WorkspaceBadge } from './workspace-badge'

const NAV_ITEMS = [
  { href: '/app', label: 'Dashboard' },
  { href: '/app/workspaces', label: 'Workspaces' },
  { href: '/app/evidence', label: 'Evidence' },
  { href: '/app/questionnaires', label: 'Questionnaires' },
  { href: '/app/review', label: 'Review Queue' },
  { href: '/app/approvals', label: 'Approvals' },
  { href: '/app/exports', label: 'Exports' }
]

function AccountMenu({ anchor }: { anchor: 'top start' | 'bottom end' }) {
  return (
    <DropdownMenu anchor={anchor} className="min-w-64">
      <DropdownItem href="/app/workspaces">
        <DropdownLabel>Switch workspace</DropdownLabel>
      </DropdownItem>
      <DropdownItem href="/app/onboarding/workspace">
        <DropdownLabel>Create workspace</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem href="/signup">
        <DropdownLabel>Sign out</DropdownLabel>
      </DropdownItem>
    </DropdownMenu>
  )
}

export function ApplicationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarSection className="gap-3">
            <WorkspaceBadge workspaceName="Acme Health" />
          </NavbarSection>
          <NavbarSpacer />
          <NavbarSection>
            <Dropdown>
              <DropdownButton as={NavbarItem} aria-label="Open account menu">
                <Avatar initials="SQ" square className="bg-zinc-800 text-white" />
              </DropdownButton>
              <AccountMenu anchor="bottom end" />
            </Dropdown>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <SidebarItem href="/app">
              <SidebarLabel>Security Questionnaire Copilot</SidebarLabel>
            </SidebarItem>
          </SidebarHeader>
          <SidebarBody>
            <SidebarSection>
              {NAV_ITEMS.map((item) => (
                <SidebarItem key={item.href} href={item.href} current={pathname === item.href}>
                  <SidebarLabel>{item.label}</SidebarLabel>
                </SidebarItem>
              ))}
            </SidebarSection>
            <SidebarSpacer />
            <SidebarSection>
              <SidebarItem href="/app/questionnaires">
                <SidebarLabel>Import to Export SLA</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/app/review">
                <SidebarLabel>Low-confidence Gate</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </SidebarBody>
          <SidebarFooter className="max-lg:hidden">
            <Dropdown>
              <DropdownButton as={SidebarItem}>
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar initials="AL" className="size-10 bg-zinc-800 text-white" square alt="" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm/5 font-medium text-zinc-950 dark:text-white">
                      Analyst Lead
                    </span>
                    <span className="block truncate text-xs/5 font-normal text-zinc-500 dark:text-zinc-400">
                      analyst@firm.example
                    </span>
                  </span>
                </span>
              </DropdownButton>
              <AccountMenu anchor="top start" />
            </Dropdown>
          </SidebarFooter>
        </Sidebar>
      }
    >
      {children}
    </SidebarLayout>
  )
}
