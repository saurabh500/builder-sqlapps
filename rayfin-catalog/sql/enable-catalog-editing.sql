SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.CatalogProductId', N'SO') IS NULL
BEGIN
    DECLARE @nextId bigint;
    SELECT @nextId = COALESCE(MAX(CONVERT(bigint, id)), 0) + 1
    FROM dbo.CatalogProduct WITH (TABLOCKX, HOLDLOCK);
    DECLARE @createSequence nvarchar(200) = N'CREATE SEQUENCE dbo.CatalogProductId AS int START WITH ' +
        CAST(@nextId AS nvarchar(20)) + N' INCREMENT BY 1 NO CYCLE;';
    EXEC sys.sp_executesql @createSequence;
    ALTER TABLE dbo.CatalogProduct ADD CONSTRAINT DF_CatalogProduct_Id
        DEFAULT (NEXT VALUE FOR dbo.CatalogProductId) FOR id;
    ALTER TABLE dbo.CatalogProduct ADD CONSTRAINT CK_CatalogProduct_RequiredText
        CHECK (LEN(TRIM(name)) > 0 AND LEN(TRIM(category)) > 0 AND LEN(TRIM(description)) > 0);
END;

COMMIT TRANSACTION;
