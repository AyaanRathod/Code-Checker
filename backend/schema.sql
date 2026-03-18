-- backend/schema.sql
-- Run this script to initialize the PostgreSQL database schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Instructors Table
CREATE TABLE IF NOT EXISTS instructors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_code VARCHAR(20) NOT NULL,
    term VARCHAR(20) NOT NULL,
    instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_code, term, instructor_id)
);

-- Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    access_key VARCHAR(50) UNIQUE NOT NULL,
    language VARCHAR(20) NOT NULL CHECK (language IN ('JAVA', 'CPP', 'C')),
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT ('Open') CHECK (status IN ('Open', 'Closed', 'Archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions Table
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_name_encrypted TEXT,
    student_id_encrypted TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
    attempt_number INTEGER DEFAULT 1,
    is_flagged BOOLEAN DEFAULT FALSE,
    review_notes TEXT
);

-- StoredFiles Table
CREATE TABLE IF NOT EXISTS stored_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    storage_path VARCHAR(500) NOT NULL,
    file_hash VARCHAR(255) NOT NULL,
    byte_size INTEGER NOT NULL,
    line_count INTEGER NOT NULL,
    fingerprint_hash JSONB -- Storing the serialized Winnowing fingerprints
);

-- ComparisonResults Table
CREATE TABLE IF NOT EXISTS comparison_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    target_submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    similarity_score DECIMAL(5, 2) NOT NULL, -- e.g. 95.50
    match_metadata JSONB, -- JSON structure identifying matching line ranges
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Boilerplate Table
CREATE TABLE IF NOT EXISTS boilerplates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    storage_path VARCHAR(500) NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_access_key ON assignments(access_key);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_stored_files_submission ON stored_files(submission_id);
CREATE INDEX IF NOT EXISTS idx_comparison_source ON comparison_results(source_submission_id);
CREATE INDEX IF NOT EXISTS idx_comparison_target ON comparison_results(target_submission_id);
