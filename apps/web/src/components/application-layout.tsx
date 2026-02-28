'use client'

import {
  Avatar,
  Button,
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  Navbar,
  NavbarDivider,
  NavbarItem,
  NavbarLabel,
  NavbarSection,
  NavbarSpacer,
  Sidebar,
  SidebarBody,
  SidebarDivider,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
  SidebarLayout
} from '@sqc/ui-catalyst'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { WorkspaceBadge } from './workspace-badge'

type IconProps = { className?: string }

function HomeIcon({ className }: IconProps) {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M10 2.5 2.5 8v9.5h5.25v-5h4.5v5h5.25V8L10 2.5Z" />
    </svg>
  )
}

function BuildingIcon({ className }: IconProps) {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M3 2.5h8.5V6H17v11.5H3V2.5Zm2.5 2.5v2H8V5H5.5Zm0 4v2H8V9H5.5Zm0 4v2H8v-2H5.5Zm6-4.5v2H14v-2h-2.5Zm0 4v2H14v-2h-2.5Z" />
    </svg>
  )
}

function ShieldIcon({ className }: IconProps) {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M10 2.5 4 4.8v4.6c0 4.1 2.5 6.9 6 8.1 3.5-1.2 6-4 6-8.1V4.8L10 2.5Zm0 2.6 3.5 1.3v3c0 2.9-1.5 4.9-3.5 5.9-2-.9-3.5-3-3.5-5.9v-3L10 5.1Z" />
    </svg>
  )
}

function ClipboardIcon({ className }: IconProps) {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M7 2.5h6a2 2 0 0 1 2 2V6h1.5v11.5h-13V6H5V4.5a2 2 0 0 1 2-2Zm0 2V6h6V4.5H7Zm-1 4v1.8h8V8.5H6Zm0 3.3v1.7h8v-1.7H6Z" />
    </svg>
  )
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="m8.8 13.8-3.6-3.6 1.8-1.8 1.8 1.9 4.2-4.2 1.8 1.8-6 5.9Z" />
    </svg>
  )
}

function DocumentIcon({ className }: IconProps) {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M5 2.5h7l3 3V17.5H5V2.5Zm2.5 3.5h5V4.8H7.5V6Zm0 3v1.5h5V9h-5Zm0 3v1.5h5V12h-5Z" />
    </svg>
  )
}

function QuestionIcon({ className }: IconProps) {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M10 2.5a6.5 6.5 0 0 1 6.5 6.5c0 2.4-1.2 4-3 5.1-.9.6-1.5 1.2-1.5 2.1v.6H8.8v-.8c0-2 1.1-3.1 2.4-3.9 1.2-.7 1.9-1.4 1.9-2.8A3.1 3.1 0 0 0 10 6.2a3.1 3.1 0 0 0-3.1 3.1H3.5A6.5 6.5 0 0 1 10 2.5Zm-1.6 15h3.2v-3H8.4v3Z" />
    </svg>
  )
}

const NAV_ITEMS = [
  { href: '/app', label: 'Dashboard', icon: HomeIcon },
  { href: '/app/workspaces', label: 'Workspaces', icon: BuildingIcon },
  { href: '/app/evidence', label: 'Evidence', icon: ShieldIcon },
  { href: '/app/questionnaires', label: 'Questionnaires', icon: ClipboardIcon },
  { href: '/app/review', label: 'Review Queue', icon: CheckIcon },
  { href: '/app/approvals', label: 'Approvals', icon: QuestionIcon },
  { href: '/app/exports', label: 'Exports', icon: DocumentIcon }
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
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarSection className="gap-2">
            <WorkspaceBadge workspaceName="Acme Health" />
            <NavbarDivider className="max-sm:hidden" />
            <NavbarItem href="/">
              <NavbarLabel>Public Site</NavbarLabel>
            </NavbarItem>
          </NavbarSection>
          <NavbarSpacer />
          <NavbarSection>
            <Button href="/app/onboarding/workspace" color="blue" className="max-sm:hidden">
              New Workspace
            </Button>
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
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-zinc-950 text-white">
                <ShieldIcon className="size-4 fill-current" />
              </span>
              <span className="min-w-0">
                <SidebarLabel>Security Questionnaire Copilot</SidebarLabel>
                <span className="block truncate text-xs/5 text-zinc-500">Conduit Security Group</span>
              </span>
            </SidebarItem>
          </SidebarHeader>
          <SidebarBody>
            <SidebarSection>
              {NAV_ITEMS.map((item) => (
                <SidebarItem key={item.href} href={item.href} current={hydrated && pathname === item.href}>
                  <item.icon className="fill-current" />
                  <SidebarLabel>{item.label}</SidebarLabel>
                </SidebarItem>
              ))}
            </SidebarSection>
            <SidebarDivider />
            <SidebarSection>
              <SidebarHeading>Upcoming Questionnaires</SidebarHeading>
              <SidebarItem href="/app/questionnaires">
                <SidebarLabel>Healthcare Buyer RFP</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/app/review">
                <SidebarLabel>Banking DDQ - Low Confidence</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
            <SidebarSpacer />
            <SidebarSection>
              <SidebarItem href="/app/review">
                <SidebarLabel>Support</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/app/approvals">
                <SidebarLabel>Changelog</SidebarLabel>
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
