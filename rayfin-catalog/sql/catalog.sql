CREATE TABLE dbo.CatalogProduct (
    id int NOT NULL PRIMARY KEY,
    name nvarchar(100) NOT NULL,
    category nvarchar(80) NOT NULL,
    description nvarchar(250) NOT NULL
);

INSERT dbo.CatalogProduct (id, name, category, description) VALUES
    (1, N'Field Notebook', N'Stationery', N'Pocket notebook with a lay-flat binding.'),
    (2, N'Desk Tray', N'Workspace', N'A shallow tray for everyday desk items.'),
    (3, N'Travel Mug', N'Outdoors', N'A stainless steel mug with a spill-resistant lid.');
