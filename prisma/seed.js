const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file:./dev.db',
        },
    },
})
async function main() {
    const clients = [
        { name: 'PHT' },
        { name: 'Client A' },
        { name: 'Client B' },
        { name: 'Client C' },
        { name: 'Client D' },
        { name: 'Client E' },
        { name: 'Client F' },
        { name: 'Client G' },
        { name: 'Client H' },
        { name: 'Client I' },
        { name: 'Client J' },
        { name: 'Client K' },
        { name: 'Client L' },
    ];

    for (const clientData of clients) {
        await prisma.client.upsert({
            where: { name: clientData.name },
            update: {},
            create: { name: clientData.name },
        });
    }
}
main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
