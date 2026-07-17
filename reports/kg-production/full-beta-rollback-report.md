# Full Beta Rollback Report

Release: `kg-beta-20260716-002`
Status: **TESTED**

The active release was soft-deactivated, confirmed invisible through the product RPC, and reactivated idempotently in one transaction. Canonical counts remained unchanged.

The restored release is `beta_active`, has `rollback_state = tested`, and has no active deactivation timestamp. Authenticated reads returned the same approved release ID and membership counts after restoration.
