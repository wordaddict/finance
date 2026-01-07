import Link from 'next/link'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  Shield,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const generalGuidelines = [
  'Never spend a dollar that was not officially approved. Verify approval status in the expense system at https://www.cciamerica.org/login; verbal approvals are not valid.',
  'Payments are processed between Thursday night and Saturday each week. Submit requests before Thursday 7pm EST. If a request older than two weeks is not processed, check for change requests via email and in the request notes, then reach out to the finance team. Finance may occasionally request earlier submissions and will notify you.',
  'Expense requests without an official vendor invoice or receipt require an expense report within two weeks of payment receipt. When a report is needed, you will be notified via email and will see a “Create Report” bar on the request.',
  'For reimbursements, only receipts less than one month old will be honored. Receipts older than one month will not be processed. If you have issues providing receipts, email usa.finance@joincci.org.',
  'Never spend above the approved amount. In emergencies, email usa.finance@joincci.org and copy your resident pastor.',
  'Expense requests should only come from team/unit leads and assistants (when the team lead is unavailable).',
  'Tax Payment Policy: CCI USA is exempt from state tax in Texas and Maryland. Ensure no state tax is included; state taxes will not be paid even if included on the receipt. Contact your campus admin with questions about waiving state taxes.',
  'Approved tax-exempt vendors in Texas and Maryland include Walmart online, Amazon, and VistaPrint. Contact Deborah Warmate or Oluwatowo Edun for more details.',
  'Reaffirmation: never spend a dollar that was not officially approved. Always confirm approval status before purchases.',
]

const categories = [
  {
    title: 'Statutory / Regular (Recurring)',
    icon: <Shield className="h-5 w-5 text-red-600" aria-hidden="true" />,
    points: [
      'Set up recurring/regular payments by emailing usa.finance@joincci.org and copying your resident pastor with the amount range and frequency.',
      'Finance will confirm an approved range; continue submitting expense requests and receipts within that range.',
      'Any expense outside the pre-approved range must be reapproved before spending.',
    ],
  },
  {
    title: 'Special Payments / Purchases',
    icon: <FileText className="h-5 w-5 text-red-600" aria-hidden="true" />,
    points: [
      'Use the expense system to submit detailed requests. For events, use the event section.',
      'Include clear notes explaining the need. Proceed with purchases only after approval is visible in the system.',
    ],
  },
  {
    title: 'Special Events',
    icon: <CalendarClock className="h-5 w-5 text-red-600" aria-hidden="true" />,
    points: [
      'Submit a budget at least two months before the event. Program managers should gather team expenses and submit via the expense system (use the provided budget template).',
      'Budget must be approved before publishing event flyers; any budget changes require finance approval.',
      'Pastoral/guest welfare is centrally organized—contact Sope to coordinate logistics with finance.',
      'Schedule a budget review after submitting an expense request: https://calendly.com/annabelobadan/30min.',
    ],
  },
]

const reportReminders = [
  'When a report is required, you will see a “Create Report” bar on the expense request and receive an email.',
  'Receipts older than one month will not be accepted for reimbursements.',
]

export const metadata = {
  title: 'CCI USA Finance Processing & Policy',
  description:
    'Finance processing and policy guidelines for Celebration Church International USA, effective 01/01/2026.',
}

export default function FinancePolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-orange-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-20 w-72 h-72 bg-red-100/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-orange-100/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-50/30 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <section className="px-4 sm:px-6 lg:px-8 pt-12 pb-10 sm:pt-16 sm:pb-12">
          <div className="max-w-5xl mx-auto space-y-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-700 border border-red-100">
              <Shield className="h-4 w-4" aria-hidden="true" />
              Finance Processing & Policy
              <Badge variant="outline" className="border-red-200 text-red-700">
                Effective 01/01/2026
              </Badge>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                CCI USA Expense Policy
              </h1>
              <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                Welcome to the CCI USA expense system. Please read and follow these
                guidelines before submitting or making any purchases. For questions,
                email usa.finance@joincci.org.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="px-6 py-3">
                <Link href="https://www.cciamerica.org/login">
                  Access Expense System
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-6 py-3">
                <Link href="https://calendly.com/annabelobadan/30min">
                  Schedule Budget Review
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="px-6 py-3">
                <Link href="mailto:usa.finance@joincci.org" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Contact Finance
                </Link>
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Drafted by Ann Obadan and approved by Pastorate — 1/3/2026
            </p>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-red-600" aria-hidden="true" />
                  <CardTitle>General Policy Guidelines</CardTitle>
                </div>
                <p className="text-sm text-gray-600">
                  Please review before submitting or spending on behalf of CCI USA.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {generalGuidelines.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-1" aria-hidden="true" />
                    <p className="text-gray-800">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
                  <CardTitle>Payment Window</CardTitle>
                </div>
                <p className="text-sm text-gray-600">
                  Know when payments are processed and how to stay on track.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-800">
                <p className="font-medium text-gray-900">
                  Payments are processed between Thursday night and Saturday weekly.
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Submit requests before Thursday 7pm EST.</li>
                  <li>
                    If a request is not processed within two weeks, check email for change
                    requests and review request notes; then contact finance.
                  </li>
                  <li>
                    Some weeks may require earlier submissions to handle volume or team schedule;
                    you will be notified ahead of time.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Card key={category.title} className="shadow-md h-full">
                <CardHeader className="pb-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {category.icon}
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="list-disc list-inside space-y-2 text-gray-800">
                    {category.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 pb-14">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-red-600" aria-hidden="true" />
                  <CardTitle>Reports & Receipts</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-800">
                <p>
                  Expense requests without an official vendor invoice or receipt must include
                  an expense report within two weeks of payment receipt.
                </p>
                <ul className="list-disc list-inside space-y-2">
                  {reportReminders.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-red-600" aria-hidden="true" />
                  <CardTitle>Tax & Compliance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-800">
                <p className="font-medium text-gray-900">
                  CCI USA is exempt from state tax in Texas and Maryland.
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Ensure state tax is removed from eligible purchases in TX and MD.</li>
                  <li>State taxes will not be paid even if they appear on receipts.</li>
                  <li>Approved tax-exempt vendors include Walmart online, Amazon, and VistaPrint.</li>
                  <li>For questions about waiving taxes, contact your campus admin.</li>
                  <li>Reach out to Deborah Warmate or Oluwatowo Edun for vendor details.</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="max-w-6xl mx-auto mt-8">
            <Card className="shadow-md bg-gradient-to-r from-red-50 to-orange-50">
              <CardContent className="py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-wide text-red-700 font-semibold">
                    Final Reminder
                  </p>
                  <h2 className="text-xl font-bold text-gray-900">
                    Never spend a dollar that was not officially approved.
                  </h2>
                  <p className="text-gray-700">
                    Always check your expense status in the system before purchasing. Verbal approval
                    is not an approval.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild>
                    <Link href="https://www.cciamerica.org/login">Check Approval Status</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="mailto:usa.finance@joincci.org">Email Finance Team</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}

