import { describe, expect, it } from "vitest";

import {
  ADMIN_PAGES,
  PAGE_CAPABILITIES,
  ROLE_PERMISSIONS,
  canManageAccount,
  effectivePermissions,
  isAdminPage,
} from "../rbac.js";

describe("effectivePermissions", () => {
  it("keeps the role's grants for owners, full admins and customers, whatever is stored", () => {
    expect(effectivePermissions("super_admin", ["pricing"])).toEqual(ROLE_PERMISSIONS.super_admin);
    expect(effectivePermissions("admin", ["pricing"])).toEqual(ROLE_PERMISSIONS.admin);
    expect(effectivePermissions("customer", ["orders"])).toEqual([]);
  });

  it("keeps the role's grants for a member without a page list", () => {
    expect(effectivePermissions("operator", null)).toEqual(ROLE_PERMISSIONS.operator);
    expect(effectivePermissions("customer_service", undefined)).toEqual(ROLE_PERMISSIONS.customer_service);
  });

  it("gives a member exactly what the ticked pages hand out", () => {
    expect(effectivePermissions("operator", ["pricing"])).toEqual(["pricing.read", "pricing.write"]);
    expect(effectivePermissions("operator", ["customers", "overview"])).toEqual(["orders.read", "customers.read"]);
  });

  it("gives a member with an empty list nothing", () => {
    expect(effectivePermissions("operator", [])).toEqual([]);
  });

  it("ignores keys it does not know, including Admin users", () => {
    expect(effectivePermissions("operator", ["users", "nonsense", "reviews"])).toEqual(["reviews.read", "reviews.moderate"]);
  });

  it("never lets a page hand out user, role or audit administration", () => {
    const everything = effectivePermissions("operator", ADMIN_PAGES);
    for (const permission of ["users.read", "users.write", "roles.write", "audit.read"] as const) {
      expect(everything).not.toContain(permission);
    }
  });
});

describe("page keys", () => {
  it("has capabilities for every page", () => {
    for (const page of ADMIN_PAGES) {
      expect(PAGE_CAPABILITIES[page].length).toBeGreaterThan(0);
    }
  });

  it("recognises page keys and nothing else", () => {
    expect(isAdminPage("orders")).toBe(true);
    expect(isAdminPage("users")).toBe(false);
    expect(isAdminPage(3)).toBe(false);
  });
});

describe("canManageAccount", () => {
  it("lets nobody manage the owner", () => {
    expect(canManageAccount("super_admin", "super_admin")).toBe(false);
    expect(canManageAccount("admin", "super_admin")).toBe(false);
  });

  it("lets only the owner manage full admins", () => {
    expect(canManageAccount("super_admin", "admin")).toBe(true);
    expect(canManageAccount("admin", "admin")).toBe(false);
  });

  it("lets full access manage members and customers, and members manage nobody", () => {
    expect(canManageAccount("admin", "operator")).toBe(true);
    expect(canManageAccount("super_admin", "customer_service")).toBe(true);
    expect(canManageAccount("admin", "customer")).toBe(true);
    expect(canManageAccount("operator", "operator")).toBe(false);
    expect(canManageAccount("customer_service", "customer")).toBe(false);
  });
});
