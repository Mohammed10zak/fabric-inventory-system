-- Create fabrics table
CREATE TABLE fabrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  cost_per_meter DECIMAL(10,2) NOT NULL,
  available_meters DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_logs table
CREATE TABLE inventory_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fabric_id UUID REFERENCES fabrics(id) ON DELETE CASCADE,
  fabric_name VARCHAR(255) NOT NULL,
  change_amount DECIMAL(10,2) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create processed_orders table (to track which orders have been processed)
CREATE TABLE processed_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shopify_order_id VARCHAR(255) NOT NULL UNIQUE,
  order_name VARCHAR(255),
  total_fabric_cost DECIMAL(10,2),
  fabric_usage JSONB,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to fabrics table
CREATE TRIGGER update_fabrics_updated_at
  BEFORE UPDATE ON fabrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default fabric data
INSERT INTO fabrics (name, cost_per_meter, available_meters) VALUES
  ('chiffon', 60, 100),
  ('satin', 80, 100),
  ('lace', 100, 100),
  ('lining', 40, 100);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE fabrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_orders ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for simplicity)
CREATE POLICY "Allow all operations on fabrics" ON fabrics FOR ALL USING (true);
CREATE POLICY "Allow all operations on inventory_logs" ON inventory_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations on processed_orders" ON processed_orders FOR ALL USING (true);
