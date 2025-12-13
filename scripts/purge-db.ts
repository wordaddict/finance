import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function purge() {
  console.log('Purging non-user data…');

  await prisma.$transaction([
    prisma.expenseItemApproval.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.expenseItem.deleteMany(),
    prisma.reportNote.deleteMany(),
    prisma.reportApproval.deleteMany(),
    prisma.reportAttachment.deleteMany(),
    prisma.approvedReportItem.deleteMany(),
    prisma.expenseReport.deleteMany(),
    prisma.expenseNote.deleteMany(),
    prisma.pastorRemark.deleteMany(),
    prisma.statusEvent.deleteMany(),
    prisma.approval.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.session.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.expenseRequest.deleteMany(),
  ]);

  console.log('Done. Users and enums left intact.');
}

purge()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());

