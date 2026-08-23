#!/bin/bash
# One-command setup for the hackathon project
# Usage: ./setup.sh

set -e

echo "🚀 Setting up AI Tutor Platform..."

# 1. Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# 2. Start Docker containers
echo "🐳 Starting PostgreSQL (with pgvector) and Redis..."
docker compose up -d

# 3. Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec hackathon-postgres pg_isready -U postgres >/dev/null 2>&1; do
  sleep 2
done

# 4. Fix template1 collation version (run once after container starts)
echo "🔧 Fixing template1 collation version..."
docker exec hackathon-postgres psql -U postgres -d template1 -c "REINDEX DATABASE template1;" >/dev/null 2>&1 || true
docker exec hackathon-postgres psql -U postgres -d template1 -c "VACUUM FREEZE;" >/dev/null 2>&1 || true
docker exec hackathon-postgres psql -U postgres -d template1 -c "ALTER DATABASE template1 REFRESH COLLATION VERSION;" >/dev/null 2>&1 || true

# 5. Create database and enable pgvector
echo "🗄️ Creating database and enabling pgvector..."
docker exec hackathon-postgres psql -U postgres -c "DROP DATABASE IF EXISTS hackathon_ai_tutor;" >/dev/null 2>&1 || true
docker exec hackathon-postgres psql -U postgres -c "CREATE DATABASE hackathon_ai_tutor TEMPLATE template0;" >/dev/null 2>&1
docker exec hackathon-postgres psql -U postgres -d hackathon_ai_tutor -c "CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null 2>&1

# 6. Apply schema via raw SQL (bypasses Prisma migrate template1 bug)
echo "📋 Applying database schema..."
cd apps/backend
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > /tmp/init_schema.sql
docker exec -i hackathon-postgres psql -U postgres -d hackathon_ai_tutor < /tmp/init_schema.sql

# 7. Create vector index
echo "🔍 Creating vector index..."
docker exec hackathon-postgres psql -U postgres -d hackathon_ai_tutor -c "CREATE INDEX IF NOT EXISTS \"MaterialVector_embedding_idx\" ON \"MaterialVector\" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);" >/dev/null 2>&1 || true

# 8. Create migration lock file (so Prisma thinks migration is applied)
echo "🔒 Creating migration lock file..."
mkdir -p prisma/migrations/20260823_init_schema
echo '{"schema":"prisma/schema.prisma"}' > prisma/migrations/20260823_init_schema/migration.lock
echo "-- Baseline migration applied via setup script" > prisma/migrations/20260823_init_schema/migration.sql

# 9. Generate Prisma Client
echo "⚡ Generating Prisma Client..."
pnpm db:generate

cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   cd apps/backend"
echo "   pnpm db:seed          # Run seed script (when ready)"
echo "   pnpm start:dev        # Start backend server"
echo ""
echo "🌐 Services:"
echo "   PostgreSQL: localhost:5432 (hackathon_ai_tutor)"
echo "   Redis:      localhost:6379"
echo "   Backend:    http://localhost:3000 (after pnpm start:dev)"
echo "   Swagger:    http://localhost:3000/api/docs"