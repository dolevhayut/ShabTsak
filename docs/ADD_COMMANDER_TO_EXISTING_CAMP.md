# Add Another Commander to an Existing Camp

This guide explains how to add an additional commander to a camp that already exists in the system.

## Important Context

- In this project, permissions are controlled by `public.users.role`.
- Camp membership is represented by `public.user_guard_links` (`userId`, `guardId`, `campId`).
- `rpc_register_with_camp_code` joins an existing camp, but creates users with role `member`.
- `rpc_onboard_commander_with_camp` creates a brand-new camp and is **not** used for existing camps.

## Recommended Flow (Safe)

1. Have the new commander register through the normal app registration flow using the camp's 4-digit registration code.
2. Promote the user from `member` to `commander` in `public.users`.
3. Verify the user is linked to the correct camp in `public.user_guard_links`.

## Step 1: Register to Existing Camp

Ask the user to register in the app with:

- full name
- ID
- phone
- existing camp 4-digit registration code

This creates:

- a row in `public.users` (role defaults to `member`)
- a row in `public.guards`
- a link row in `public.user_guard_links`

## Step 2: Promote User to Commander

Run:

```sql
update public.users
set role = 'commander'
where id = 'NEW_COMMANDER_ID';
```

Replace `NEW_COMMANDER_ID` with the actual user ID.

## Step 3: Verify Role + Camp Link

Run:

```sql
select
  u.id,
  u.name,
  u.role,
  ugl."campId",
  c.name as camp_name
from public.users u
left join public.user_guard_links ugl
  on ugl."userId" = u.id
left join public.camps c
  on c.id = ugl."campId"
where u.id = 'NEW_COMMANDER_ID';
```

Expected result:

- `role = 'commander'`
- at least one row with the intended `campId`

## Troubleshooting

- If no `user_guard_links` row exists:
  - most likely the user registered with the wrong camp code or did not finish registration.
  - best fix: re-register with the correct camp code.
- If role update succeeds but UI still shows member permissions:
  - log out and log in again so local auth state refreshes.

## Optional: Safer Long-Term Improvement

Create a dedicated RPC such as `rpc_add_commander_to_camp(...)` that:

1. validates caller with `assert_commander`
2. verifies target user belongs to the same camp
3. updates `users.role = 'commander'`
4. returns the updated user/camp mapping

This avoids manual SQL and keeps all permission changes behind audited server-side logic.
