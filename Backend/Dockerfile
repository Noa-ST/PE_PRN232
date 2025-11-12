FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Backend/Backend.csproj Backend/
RUN dotnet restore Backend/Backend.csproj

COPY Backend/ Backend/
WORKDIR /src/Backend
RUN dotnet publish -c Release -o /app/out

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/out .

ENTRYPOINT ["dotnet", "Backend.dll"]