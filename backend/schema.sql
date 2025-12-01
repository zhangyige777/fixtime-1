-- FixTime AI Database Schema v1.0
-- All tables include user_id for multi-tenant isolation

-- Users/Tenants table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,  -- Clerk User ID (user_2p...)
  email TEXT NOT NULL UNIQUE,
  company_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',  -- admin, technician
  plan_type TEXT NOT NULL DEFAULT 'starter',  -- starter, growth, scale
  asset_count INTEGER NOT NULL DEFAULT 0,  -- Cached count for plan limits
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Equipment templates for Smart Templates feature
CREATE TABLE IF NOT EXISTS equipment_templates (
  id TEXT PRIMARY KEY,  -- UUID
  name TEXT NOT NULL,  -- e.g., "Generator", "CNC Machine", "HVAC System"
  category TEXT NOT NULL,  -- e.g., "Electrical", "Mechanical", "HVAC"
  description TEXT,
  default_health_score INTEGER NOT NULL DEFAULT 100,
  default_status TEXT NOT NULL DEFAULT 'Running',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Maintenance checklists for templates
CREATE TABLE IF NOT EXISTS template_checklists (
  id TEXT PRIMARY KEY,  -- UUID
  template_id TEXT NOT NULL,  -- FK to equipment_templates.id
  title TEXT NOT NULL,  -- e.g., "Daily Inspection", "Monthly Service"
  frequency_days INTEGER NOT NULL,  -- How often this task should repeat
  estimated_duration INTEGER,  -- Minutes
  task_text TEXT NOT NULL,  -- Description of what to do
  priority TEXT NOT NULL DEFAULT 'Normal',  -- Low, Normal, Critical
  is_active BOOLEAN NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (template_id) REFERENCES equipment_templates(id)
);

-- Assets/Equipment table
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,  -- UUID
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'Running',  -- Running, Warning, Stopped, Repair
  health_score INTEGER NOT NULL DEFAULT 100,
  image_url TEXT,  -- Placeholder for future use
  template_id TEXT,  -- FK to equipment_templates.id
  last_maintenance_date INTEGER,
  next_maintenance_date INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES profiles(id),
  FOREIGN KEY (template_id) REFERENCES equipment_templates(id)
);

-- Work orders table
CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,  -- UUID
  user_id TEXT NOT NULL,
  asset_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'Normal',  -- Low, Normal, Critical
  status TEXT NOT NULL DEFAULT 'Open',  -- Open, In Progress, Completed, Cancelled
  assigned_to TEXT,  -- User ID of assigned technician
  due_date INTEGER,
  completed_at INTEGER,
  checklist_template_id TEXT,  -- FK to template_checklists.id
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES profiles(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (checklist_template_id) REFERENCES template_checklists(id)
);

-- Work order checklist items (tasks specific to a work order)
CREATE TABLE IF NOT EXISTS work_order_tasks (
  id TEXT PRIMARY KEY,  -- UUID
  work_order_id TEXT NOT NULL,
  task_text TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT 0,
  completed_by TEXT,  -- User ID
  completed_at INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
);

-- Insert default equipment templates
INSERT OR IGNORE INTO equipment_templates (id, name, category, description) VALUES
  ('tmpl-gen-001', 'Generator', 'Electrical', 'Diesel or gasoline generator for backup power'),
  ('tmpl-cnc-001', 'CNC Machine', 'Mechanical', 'Computer Numerical Control machine tool'),
  ('tmpl-hvac-001', 'HVAC System', 'HVAC', 'Heating, Ventilation, and Air Conditioning unit'),
  ('tmpl-forklift-001', 'Forklift', 'Material Handling', 'Industrial forklift for moving goods'),
  ('tmpl-compressor-001', 'Air Compressor', 'Mechanical', 'Industrial air compressor system'),
  ('tmpl-conveyor-001', 'Conveyor Belt', 'Mechanical', 'Automated conveyor system'),
  ('tmpl-press-001', 'Hydraulic Press', 'Mechanical', 'Hydraulic press machine'),
  ('tmpl-pump-001', 'Water Pump', 'Mechanical', 'Water circulation pump');

-- Insert template checklists for Generator
INSERT OR IGNORE INTO template_checklists (id, template_id, title, frequency_days, task_text, priority, order_index) VALUES
  ('task-gen-001', 'tmpl-gen-001', 'Daily Visual Inspection', 1, 'Check for any leaks or unusual noises', 'Normal', 1),
  ('task-gen-002', 'tmpl-gen-001', 'Daily Visual Inspection', 1, 'Verify fuel level is above 50%', 'Normal', 2),
  ('task-gen-003', 'tmpl-gen-001', 'Weekly Maintenance', 7, 'Check oil level and top up if needed', 'Normal', 1),
  ('task-gen-004', 'tmpl-gen-001', 'Weekly Maintenance', 7, 'Inspect air filter for dirt accumulation', 'Normal', 2),
  ('task-gen-005', 'tmpl-gen-001', 'Monthly Service', 30, 'Change oil and oil filter', 'Critical', 1),
  ('task-gen-006', 'tmpl-gen-001', 'Monthly Service', 30, 'Test battery voltage and connections', 'Normal', 2),
  ('task-gen-007', 'tmpl-gen-001', 'Quarterly Service', 90, 'Inspect and clean spark plugs', 'Normal', 1),
  ('task-gen-008', 'tmpl-gen-001', 'Annual Service', 365, 'Complete generator service by certified technician', 'Critical', 1);

-- Insert template checklists for CNC Machine
INSERT OR IGNORE INTO template_checklists (id, template_id, title, frequency_days, task_text, priority, order_index) VALUES
  ('task-cnc-001', 'tmpl-cnc-001', 'Daily Check', 1, 'Clean machine work area', 'Low', 1),
  ('task-cnc-002', 'tmpl-cnc-001', 'Daily Check', 1, 'Check fluid levels (coolant, lubricant)', 'Normal', 2),
  ('task-cnc-003', 'tmpl-cnc-001', 'Weekly Maintenance', 7, 'Inspect and clean chip conveyor', 'Normal', 1),
  ('task-cnc-004', 'tmpl-cnc-001', 'Monthly Maintenance', 30, 'Check and tighten all bolts and connections', 'Normal', 1),
  ('task-cnc-005', 'tmpl-cnc-001', 'Monthly Maintenance', 30, 'Lubricate all grease points', 'Normal', 2),
  ('task-cnc-006', 'tmpl-cnc-001', 'Quarterly Service', 90, 'Calibrate machine accuracy', 'Critical', 1);

-- Insert template checklists for Forklift
INSERT OR IGNORE INTO template_checklists (id, template_id, title, frequency_days, task_text, priority, order_index) VALUES
  ('task-fl-001', 'tmpl-forklift-001', 'Daily Inspection', 1, 'Check tire condition and pressure', 'Critical', 1),
  ('task-fl-002', 'tmpl-forklift-001', 'Daily Inspection', 1, 'Test brakes and horn', 'Critical', 2),
  ('task-fl-003', 'tmpl-forklift-001', 'Daily Inspection', 1, 'Check fluid levels (oil, hydraulic)', 'Normal', 3),
  ('task-fl-004', 'tmpl-forklift-001', 'Weekly Check', 7, 'Inspect forks for damage', 'Critical', 1),
  ('task-fl-005', 'tmpl-forklift-001', 'Monthly Service', 30, 'Grease all fittings and pivot points', 'Normal', 1),
  ('task-fl-006', 'tmpl-forklift-001', 'Annual Service', 365, 'Full inspection and certification', 'Critical', 1);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_template_id ON assets(template_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_user_id ON work_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_asset_id ON work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON work_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_template_checklists_template_id ON template_checklists(template_id);
CREATE INDEX IF NOT EXISTS idx_work_order_tasks_work_order_id ON work_order_tasks(work_order_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);