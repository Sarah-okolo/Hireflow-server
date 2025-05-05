# HireFlow

**HireFlow** is a full-stack hiring platform that facilitates interaction between candidates, recruiters, and companies. It allows each user type to perform role-specific actions such as posting jobs, applying to roles, and managing applications — all with fine-grained access control powered by [Permit.io](https://www.permit.io/).

---

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
- [Authorization with Permit.io](#authorization-with-permitio)
- [Test Accounts](#test-accounts)
- [Technologies Used](#technologies-used)
- [License](#license)

---

## Features

- Role-based authentication and authorization with three user types:
  - **Candidates**: Search and apply for jobs, view application status.
  - **Recruiters**: Post and manage jobs, view and shortlist applicants.
  - **Companies**: Manage recruiters and job postings, oversee recruitment progress.
- Secure login/signup with role selection
- Protected routes and data visibility depending on user roles
- Integration with Permit.io for access control and permission enforcement

---

## Demo

Visit the live application here:  
👉 **[https://hirefloww.netlify.app/](https://hirefloww.netlify.app/)**

---


## Authorization with Permit.io

This project uses [Permit.io](https://www.permit.io/) for managing authorization and user roles. I made use of Permit.io’s RBAC model (Role-Based Access Control) via its cloud-hosted Policy Decision Point (PDP) to cleanly separate permission logic from the rest of the codebase. All policies and permissions were configured using the Permit CLI.

Here's a breakdown of the steps I followed to integrate Permit.io into the project:

- **Installed the permit CLI**:
```bash
npm install -g @permitio/cli
```

- **Logged into my permit account**:
```bash
permit Login
```
- **Initialized permit**:
```bash
permit init
```

- **Configure resources**:
```bash
jobs, applications, companies, recruiters, candidates
```
Next, I was prompted to configure actions for the resources that I just created.

- **Configure actions**:
These were the actions I configured for my resources
```bash
create, read, update, delete, approve, reject, shortlist
```
Next, I was prompted to configure the roles and permissions.

- **Configure roles and permissions**:
The roles and resources were assigned as such:
```js
Company|recruiters:delete|jobs:read|jobs:delete|candidates:read|companies:delete|applications:approve|applications:reject, 
Candidate|jobs:read|applications:create|applications:read, 
Recruiter|jobs:create|jobs:read|jobs:delete|applications:read|applications:reject|applications:shortlist
```
![configure roles and permissions](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/cv25wuiz172ybjr2rzgl.png)

Next, my request was processed:
![request processing](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/iwz5v2zolifrzii4nqbp.png)

- **Created 3 users and assigned each to their roles**:
I assigned all 3 users to their different roles:
![Assigning users to roles](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/nmn5ln7yy6e8trdccx9d.png)
Next, I was prompted to enforce a PDP.

- **PDP (Policy Decision Point) setup**:
I skipped the part where I’d have to enforce a self-hosted PDP because I chose to use Permit’s cloud-hosted PDP instead — simpler and faster for my current needs.
```
https://cloudpdp.api.permit.io
```
This lets the app connect with Permit’s decision engine over the cloud.

And the permit initialization has been successfully completed.

- **Install the permit SDK**:
Once initialization was complete, I installed the Permit SDK to integrate it into my codebase:
```bash
npm install permitio
```
From there, I could wrap permission checks around specific views and features to ensure users only had access to what their role allowed.

---

- **Setup the Permit client**
I created a reusable Permit instance using the SDK.
```js
const { Permit } = require("permitio");

const permit = new Permit({
  pdp: "https://cloudpdp.api.permit.io",
  token: process.env.PERMIT_API_KEY,
});

module.exports = permit;
```

- **Wrote the middleware to check permissions**
This is the heart of it — it runs before protected routes and checks with Permit:
```js
// middleware/checkPermission.js
const permit = require("../config/permit");

const checkPermission = (action, resource) => {
  return async (req, res, next) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      const allowed = await permit.check(userId, resource, action);

      if (!allowed) {
        return res.status(403).json({ error: "Access denied" });
      }

      next();
    } catch (err) {
      console.error("Permit error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

module.exports = checkPermission;
```

- **Used that middleware in routes**
For example in the jobs routes:
```js
// Create a job (Recruiters can create jobs)
router.post(
  '/create',
  authMiddleware,
  checkPermission('create', 'jobs'),
  (req, res) => {
    // Logic to create a job here
    res.status(201).send('Job created!');
  }
);

// Delete a job (Only recruiters who created the job can delete it)
router.delete(
  '/:id',
  authMiddleware,
  checkPermission('delete', 'jobs'),
  (req, res) => {
    const jobId = req.params.id;
    // Logic to delete the job
    res.status(200).send(`Job ${jobId} deleted successfully!`);
  }
);
```
I was able to make use of the all of the routes, from jobs, to cmpanies, recruiters, applications, and candidates.

## Permit.io Over Traditional Role Checks
In this section, I explore the pros and cons making use of traditional role checks vs permit.io.

### With traditional role checks
In previous applications I worked on, I made use of traditional role-based checks directly in the code.

```js
app.get("/api/jobs", async (req, res) => {
  const userRole = req.user.role;

  // Hardcoded check for roles allowed to "read" jobs
  const allowedRoles = ["recruiter", "company", "candidate"];

  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ message: "Access denied" });
  }

  ...
});

```
This approach tightly couples permission logic with route logic. Every new permission required another hardcoded condition somewhere in the app. It also meant redeploying the server just to change access rules.
- Every new action (like approve, delete, shortlist) requires adding more logic manually.

- No dynamic control — changes to role permissions require code changes and redeploys.

- There's no centralized policy — it spreads across multiple route handlers, making maintenance difficult as complexity grows.

While that worked on a small scale, it quickly became rigid and hard to manage — especially as more roles and actions were introduced.

### With Permit.io
With Permit.io, all permissions are defined declaratively via CLI. In the code, I now use a centralized `permit.check()` call:
```js
app.get("/api/jobs", async (req, res) => {
  const allowed = await permit.check({
    user: req.user.id,
    action: "read",
    resource: "jobs",
  });

  if (!allowed) {
    return res.status(403).json({ message: "Access denied" });
  }
```

This made the code cleaner, and all role updates now happen outside the codebase, making it faster, safer, and easier to scale.


Permit.io helped me enforce RBAC cleanly and consistently, while still allowing for flexibility as the app grows.

### Quick comparison

| Feature                         | **Permit.io**              | **Manual Role Checks**    |
| ------------------------------- | -------------------------- | ------------------------- |
| Roles managed where?            | Outside the code (via CLI) | Inside the code           |
| Centralized policy?             | ✅ Yes                      | ❌ No
| Policy updates need a redeploy? | ❌ No                       | ✅ Yes                     |
| Scalable for many roles?        | ✅ Yes                      | ❌ Gets messy              |
| Decouples logic from auth?      | ✅ Yes                      | ❌ No                      |
| Clean, centralized checks?      | ✅ Yes                      | ❌ Scattered if-else logic |


## Technologies Used

- Node.js + Express
- MongoDB
- Permit.io (authorization and access control)
---