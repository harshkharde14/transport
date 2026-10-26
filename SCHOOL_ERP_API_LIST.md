# School ERP API List

**Status: Proposed API plan, based on the database design approved on 2026-10-18.**

This file lists the APIs in a useful learning and building order. It is a planning document. These endpoints have not been implemented.

Read the [Project Overview](SCHOOL_ERP_PROJECT_OVERVIEW.md) for the business flow, the [approved Database Plan](SCHOOL_ERP_DATABASE_PLAN.md) for fields and rules, and [API Examples](SCHOOL_ERP_API_EXAMPLES.md) for sample requests and responses.

The scope stays the same: parent registration, admission, classes, school staff, optional transport, manual trips, checklists, and safe child handover. Live tracking, GPS, maps, ETA, fees, exams, payroll, and automatic messages are outside this version.

## 1. Simple API words

| Word | Meaning |
|---|---|
| API | A way for the screen to ask the server to read or save something. |
| Endpoint | The address for one kind of API action. |
| GET | Read information. It must not change records. |
| POST | Create a record or perform a named action, such as approving admission. |
| PATCH | Change selected allowed fields of an existing record. |
| PUT | Save a complete replacement for a known item, such as one trip's checklist answers. |
| Request | Information sent to the server. |
| Response | Information the server returns. |
| Path parameter | An ID in the address. Example: `:id` in `/students/:id`. |
| Query parameter | A filter after `?`. Example: `?status=submitted&page=1`. |
| Authenticated | The server knows which account is logged in. |
| Retry-safe | Sending the same action again does not create a second result. |

All paths below start with **`/api/v1`**. For example, `/auth/login` means `/api/v1/auth/login`.

An `:id` is a real ObjectId represented as a 24-character hexadecimal string over HTTP. Different names such as `:studentId` explain which record is expected. Human-readable codes such as `ADM-2026-0012` are display/business numbers, not substitutes for these IDs.

## 2. Who can use an API?

| Short name in the tables | Login role and access limit |
|---|---|
| Public | No login. Only the small public school lookup, parent registration, and login endpoints. |
| My account | Any active logged-in account, acting on itself. |
| School admin | `school_admin`, limited to its own school. |
| Admissions | `admission_officer`, with an active staff profile. |
| Transport | `transport_admin`, with an active staff profile. |
| Family | `parent`, with its own active parent profile. Applications must belong to it; student access needs a verified active guardian link. |
| Teacher | `teacher`, with a valid assignment to the relevant section. |
| Crew | `driver` or `attendant`, with a valid assignment to the route/trip. |
| Gate staff | `gatekeeper`, performing school-gate identity checks or handovers. |
| Attendant | `attendant`, performing handover for their assigned trip. |

A school admin can be given admission or transport roles too. The `school_admin` role alone does not silently grant every operational role. `staff.job_roles` describe the employee's work; `users.roles` control login access. Check both where needed.

Family transport actions also require `student_guardians.can_manage_transport`. Family pickup-management actions require `can_authorize_pickup`. A user with several roles still needs the relevant relationship or assignment for the action they are performing.

## 3. Rules shared by all APIs

1. After login, derive `school_id` and acting user/staff/parent IDs from the authenticated account. Do not accept them as authority from request bodies. Registration and login accept `school_code` only to select a school.
2. Check the account, school, profile, relationship, and assignment status where applicable. Scope every query, linked ID, and private file to the same school.
3. The server creates `_id`, timestamps, review actors, verification actors, token hashes, audit rows, and internal counters. Public clients cannot set these fields.
4. Use an allowed-field list for each create/update. A profile PATCH cannot change login roles; an application PATCH cannot approve admission; an enrollment PATCH cannot allocate seats.
5. List APIs support `page` and `limit`, defaulting to page 1 and 20 records, with a maximum of 100. Return only permitted fields. Use stable sorting with `_id` as a tie-breaker. Reject unsupported filters/sorts.
6. `DateOnly` values use `YYYY-MM-DD`. Periods include `valid_from` and exclude `valid_to`. Actual event timestamps use UTC. Fixed times use the school's timezone. Follow the database plan's date rules.
7. Return `200` for successful reads/updates/actions, and `201` when a new resource or set of resources is created. A retry returning an existing result uses `200`. A known unsuccessful handover can still create a `denied` event; it never means the child was released.
8. Do not expose password hashes, QR hashes, private file paths, or another family's details. A raw QR secret is returned only at issue time. Never place passwords or QR secrets in query strings or logs.
9. No general hard-delete endpoints are planned. Preserve people, assignments, applications, and events through their defined states and dates. Optional file removal/retention can be designed separately.
10. Log important changes as described in `audit_logs`. Normal clients cannot create or edit audit rows.

Login establishes an authenticated session; logout ends it. Cookie/token format, session lifetime, session storage, and password-recovery delivery will be specified before authentication is implemented. This API list does not add a JWT, refresh-token collection, or automatic email feature to the approved database design. Role/status changes must affect subsequent authorized actions.

### Response shape

| Kind | Shape |
|---|---|
| One resource or action result | `{ "data": { ... } }` |
| List | `{ "data": [ ... ], "pagination": { "page": 1, "limit": 20, "total": 5 } }` |
| Error | `{ "error": { "code": "CAPACITY_FULL", "message": "This route has no seat for the requested dates." } }` |

Optional error `fields` can explain invalid input keys. Errors must not reveal hidden records or private data. HTTP `400` means invalid input, `401` means login is missing/invalid, `403` means an action is forbidden, `404` means no visible record was found, `409` means a duplicate/state/seat/schedule conflict, and `429` means too many attempts. Use `404` for records outside the caller's visible scope instead of revealing their existence.

### How to read the catalog

The `Input / result` column lists the main keys or output. Full field types and required fields remain in the database plan. Values supplied by the server are not client input. A GET has no request body; its listed inputs are query filters. An action with no input uses an empty object.

## 4. Ordered API catalog

### 01. School lookup and login

Collections: `schools`, `users`, `parents`. Start here so later actions know who is calling them.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 001 | GET `/public/schools/:schoolCode` | Public | Result: code, name, contact details, timezone | Help a parent choose a known active school. No family/staff lists or internal counters. |
| 002 | POST `/auth/register-parent` | Public | `school_code`, `email`, `password`, `parent` profile | Create the login and parent profile together. Server gives only the `parent` role. |
| 003 | POST `/auth/login` | Public | `school_code`, `email`, `password` | Check credentials; establish a session; return safe account/role information. |
| 004 | POST `/auth/logout` | My account | No body fields | End the current session. No changes to parent/student profiles. |
| 005 | GET `/auth/me` | My account | Result: user ID, school, roles, linked profile IDs | Tell the screen who is logged in. Never return a password/hash. |
| 006 | PATCH `/auth/me/password` | My account | `current_password`, `new_password` | Change own password after checking the current one. Invalidate other sessions according to the authentication design. |

Normalize login email before checking uniqueness. An existing email cannot register a duplicate login in the same school. A staff member who is also a parent signs in and adds their own parent profile through endpoint 024 below.

### 02. School and academic setup

Collections: `schools`, `academic_years`, `shifts`, `classes`, `sections`.

The first school and first admin are created through trusted project setup, outside these public APIs. The first admin can then manage its own school. There is no public create-admin or create-school endpoint.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 007 | GET `/school` | My account | Safe school details | Read the current account's school. |
| 008 | PATCH `/school` | School admin | Name, contact, address; timezone only before dated operations exist | Update school details. Internal allocation counter is never writable by a client. |
| 009 | POST `/academic-years` | School admin | `name`, `starts_on`, `ends_on` | Create a planned academic year. |
| 010 | GET `/academic-years` | School admin, Admissions, Transport | `status`, `is_current` | List school years. |
| 011 | GET `/academic-years/:id` | School admin, Admissions, Transport | One year | Read the year. |
| 012 | PATCH `/academic-years/:id` | School admin | Name/dates while unused | Correct setup without changing dates already used by placements/routes. |
| 013 | POST `/academic-years/:id/activate` | School admin | `make_current` boolean | Activate the year; if requested, switch the one current year atomically. |
| 014 | POST `/academic-years/:id/close` | School admin | `reason` | Close only after resolving open decisions and future commitments; clear current flag if needed. |
| 015 | POST `/shifts` | School admin | `name`, `starts_at`, `ends_at` | Create a school session. |
| 016 | GET `/shifts` | School admin, Admissions, Transport | `status` | List sessions. |
| 017 | PATCH `/shifts/:id` | School admin | Name, status; times only while unused | Used timetable changes require a new shift. Deactivation checks dependencies. |
| 018 | POST `/classes` | School admin | `code`, `name`, `sort_order` | Create a reusable class level. |
| 019 | GET `/classes` | School admin, Admissions, Teacher | `status` | List class levels. |
| 020 | PATCH `/classes/:id` | School admin | Name, sort order, status | Preserve used class identity; reject changes that break future placements. |
| 021 | POST `/sections` | School admin | `academic_year_id`, `class_id`, `shift_id`, `name`, `capacity` | Create a class group for a year. |
| 022 | GET `/sections` | School admin, Admissions, Teacher | Year/class/shift filters | List sections; a teacher sees assigned sections. |
| 023 | PATCH `/sections/:id` | School admin | Name, capacity, status | Capacity cannot fall below commitments. Used class/year/shift identity is immutable. |

Single shift/class/section information is available through these bounded filtered lists or linked detail responses; separate GET-by-ID routes can be added only if a screen needs them. Parent dropdowns use `/admission-options`, not school administration lists.

### 03. Parent profiles and user access

Collections: `parents`, `users`. Student access is granted separately through verified guardian links.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 024 | POST `/parents/me` | My account | Parent name, phone, address | Give an existing staff login its own parent profile and fixed parent role. Only one profile per login. |
| 025 | GET `/parents/me` | Family | Own profile | Read personal contact details. |
| 026 | PATCH `/parents/me` | Family | Name, phone, alternate phone, address | Update own profile; cannot assign children or roles. |
| 027 | POST `/parents` | Admissions | Name, phone, address | Create an offline guardian profile for later verified linking. Does not create a login. |
| 028 | GET `/parents` | Admissions, School admin | Name/contact search, status | Staff directory of parents for legitimate school work. No family-wide listing for parents. |
| 029 | GET `/parents/:id` | Admissions, School admin | One profile | Read a school parent for admission/verification work. |
| 030 | POST `/parents/:id/account` | School admin | Verified `existing_user_id`, or new `email` and `initial_password`; `reason` | Attach a verified login to an offline profile, or create it with fixed parent role. Never auto-link by phone. |
| 031 | PATCH `/parents/:id/status` | Admissions | `status`, `reason` | Deactivate/reactivate profile with dependent guardian/pickup checks. |
| 032 | GET `/users` | School admin | Role, status, email filters | List safe login metadata. |
| 033 | GET `/users/:id` | School admin | Safe user metadata | View account roles/status and linked profiles. |
| 034 | PATCH `/users/:id/access` | School admin | Allowed `roles`, `status`, `reason` | Change permissions/status, checking profiles and assignments. Protect the last active school-admin account. |

Account attachment is a verified school-admin action, recorded in audit. Both records must belong to this school. An existing login already linked to another parent/staff profile of the same kind cannot be silently moved. Never replace an existing user's password as part of profile attachment. Initial passwords are private input for a new account only; no automatic email delivery is included.

### 04. Staff and teacher assignments

Collections: `staff`, `users`, `teacher_assignments`.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 035 | POST `/staff` | School admin | Employee code, name, phone, job roles, joining date, driver details when needed | Register teacher, driver, attendant, gatekeeper, or office staff. |
| 036 | GET `/staff` | School admin, Admissions, Transport | Job role, status, search | Find staff; return only job-relevant contact/work fields. |
| 037 | GET `/staff/:id` | School admin; own staff account | One staff profile | Read allowed details. Restricted license data is not a family-facing field. |
| 038 | PATCH `/staff/:id` | School admin | Name, phone, permitted job/driver fields | Recheck assignments before changing roles/license information. |
| 039 | PATCH `/staff/:id/status` | School admin | `status`, optional `left_on`, `reason` | Mark on leave/inactive only after resolving affected future assignments. |
| 040 | POST `/staff/:id/account` | School admin | Verified `existing_user_id`, or new `email`, `initial_password`, allowed `roles` | Give a staff member login access; supports an existing verified parent login. |
| 041 | POST `/teacher-assignments` | School admin | `staff_id`, `section_id`, `responsibility`, `valid_from`, `valid_to` | Assign a teacher; prevent overlapping class teachers for a section. |
| 042 | GET `/teacher-assignments` | School admin, Admissions; Teacher for own assignments | Section, staff, effective-date filters | Read class responsibility and history. |
| 043 | POST `/teacher-assignments/:id/replace` | School admin | `effective_on`, replacement `staff_id`, `reason` | End old responsibility and create its replacement together. |
| 044 | POST `/teacher-assignments/:id/end` | School admin | `effective_on`, `reason` | Close a responsibility that began; keep its historical period. |
| 045 | POST `/teacher-assignments/:id/cancel` | School admin | `reason` | Cancel a responsibility that never began. |

### 05. Admission applications and private documents

Collections: `admission_applications`; approval also writes `students`, `student_guardians`, `student_academic_enrollments`, and `audit_logs`.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 046 | GET `/admission-options` | Family, Admissions | Result: available years, class levels, shifts | Provide safe application choices; no student roster or internal capacity data. |
| 047 | POST `/admission-applications` | Family | Year, requested class/shift, child, relationship, transport interest, optional previous school | Save one child's draft. Derive the applicant parent from the session. |
| 048 | GET `/admission-applications` | Family, Admissions | Status, year filters | Parent sees own applications; admissions sees school review queue. |
| 049 | GET `/admission-applications/:id` | Family owner, Admissions | Application and decision details | Read the application in permitted scope. |
| 050 | PATCH `/admission-applications/:id` | Family owner | Editable application fields | Only `draft` or `needs_changes`. No review/approval/status fields. |
| 051 | POST `/admission-applications/:id/documents` | Family owner | Private file upload and `document_type` | Upload while editable; server creates the storage reference and metadata. |
| 052 | GET `/admission-applications/:id/documents/:documentIndex` | Family owner, Admissions | Authorized file download | Use the zero-based document position returned with the application; the server resolves its private storage reference after checking ownership. |
| 053 | POST `/admission-applications/:id/submit` | Family owner | No body fields | Validate required information and move draft/needs-changes to submitted. |
| 054 | POST `/admission-applications/:id/start-review` | Admissions | No body fields | Move submitted to under-review. |
| 055 | POST `/admission-applications/:id/request-changes` | Admissions | `review_note` | Ask the parent to correct information. |
| 056 | POST `/admission-applications/:id/approve` | Admissions | `approved_section_id`, `admission_no`, `roll_no`, `valid_from`, `valid_to`, optional `review_note` | Approve and create student, verified guardian, and class placement together. |
| 057 | POST `/admission-applications/:id/reject` | Admissions | `review_note` | Reject an application under review; preserve the reason/history. |
| 058 | POST `/admission-applications/:id/withdraw` | Family owner | `reason` | Withdraw before approved/rejected; preserve the record and audit reason. |

The server assigns a unique `application_no`. Admission/roll numbers may be assigned by the authorized admission officer in approval input; database uniqueness and period checks still apply. The actor, approval status, review time, and created IDs are server-controlled. A duplicate child application needs staff review; never merge children by name or birth date alone.

Upload limits, accepted file types, private storage configuration, and download streaming will be specified during implementation. Application responses expose document type, filename, upload time, and its list position, not the backing `storage_key`. This version only appends documents; it has no removal/reordering action that would change their positions. A client-supplied arbitrary URL, storage path, or filesystem path is not accepted as an uploaded document. No separate file collection is required by this list.

### 06. Students and verified guardian links

Collections: `students`, `student_guardians`, `parents`.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 059 | GET `/students` | Family, Admissions, Teacher | Year/section/status filters | Family sees linked children; teacher sees assigned-section roster; admissions sees school students. |
| 060 | GET `/students/:id` | Family, Admissions, Teacher | Allowed student details and placement summary | Same ownership/assignment restrictions as the list. |
| 061 | PATCH `/students/:id` | Admissions | Name, birth date, optional gender; `reason` | Correct identity details without rewriting the original application. |
| 062 | POST `/students/:studentId/guardians` | Admissions | `parent_id`, relationship, primary-contact flag, permission flags, `reason` | Verify and add a guardian relationship. Existing pairs use restore/update actions. |
| 063 | GET `/students/:studentId/guardians` | Family, Admissions | Safe guardian relationship/contact summary | A family must already have access to this child. Never include login/private identity details. |
| 064 | PATCH `/student-guardians/:id/permissions` | Admissions | Primary-contact and management flags; `reason` | Change verified permissions; recheck grants/tokens and the one-primary-contact rule. |
| 065 | POST `/student-guardians/:id/revoke` | Admissions | `reason` | Revoke family access and invalidate dependent pickup permission/tokens. |
| 066 | POST `/student-guardians/:id/restore` | Admissions | Verified relationship/permission values; `reason` | Reverify and reuse the same parent-child pair. Do not automatically restore old pickup grants. |

There is no standalone `POST /students` for parents or staff. Initial students come from admission approval. A parent profile, shared phone, or known admission number is not proof of a guardian relationship.

### 07. Academic placement, class changes, and school exit

Collection: `student_academic_enrollments`; actions may also update future transport records and `students`.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 067 | GET `/academic-enrollments` | Family, Admissions, Teacher | Student/year/section/effective-date filters | Read permitted class placements and history. |
| 068 | GET `/academic-enrollments/:id` | Family, Admissions, Teacher | One permitted placement | Read class/year/shift through the section. |
| 069 | POST `/students/:studentId/academic-enrollments` | Admissions | `section_id`, `roll_no`, `valid_from`, `valid_to` | Add next-year or returning-student placement; reuse student identity. First placement is created by approval. |
| 070 | POST `/academic-enrollments/:id/transfer` | Admissions | `effective_on`, new `section_id`, `roll_no`, `reason` | Close old placement, create new placement, and replace affected future transport segments atomically. |
| 071 | POST `/academic-enrollments/:id/complete` | Admissions | No body fields | Complete a placement after its period; does not create the next year's placement automatically. |
| 072 | POST `/academic-enrollments/:id/cancel` | Admissions | `reason` | Cancel a future placement that never began and resolve dependent future transport. |
| 073 | POST `/students/:id/withdraw` | Admissions | `effective_on`, `reason` | Mark student withdrawn; close/cancel placements and transport; resolve open requests and pickup permissions/tokens. |
| 074 | POST `/students/:id/graduate` | Admissions | `effective_on`, `reason` | Finish study and future services while preserving history. |

Section capacity, roll-number conflicts, and overlapping placements must be checked for the relevant dates. A class transfer that cannot safely preserve transport returns a conflict with a clear reason; it must not leave a half-updated class or route link. The first version uses one student's progression per call, which is easier to understand and retry than a large promotion batch.

For a returning withdrawn student, endpoint 069 requires a placement starting today, staff verification of the return and guardian relationship, and an atomic change back to `students.status = active`. Old revoked pickup grants/tokens stay revoked; new transport requires a new request. Graduated-student readmission is a separate future decision. Withdrawal/graduation endpoints 073-074 take effect immediately and require `effective_on` to be the current school date; they do not schedule a future scalar student-status change. Validate every affected period and reject an invalid zero-length or history-rewriting change instead of silently changing past records.

### 08. Buses and stops

Collections: `buses`, `stops`.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 075 | POST `/buses` | Transport | Code, registration, type, student capacity, optional chassis number | Register a bus. |
| 076 | GET `/buses` | Transport | Status/type/search filters | List buses and capacity. Availability is date-based, not an `is_assigned` flag. |
| 077 | GET `/buses/:id` | Transport | Bus details | Read one bus. |
| 078 | PATCH `/buses/:id` | Transport | Allowed vehicle details/capacity | Reject duplicate registration or capacity below existing commitments. |
| 079 | PATCH `/buses/:id/status` | Transport | `status`, `reason` | Handle active/maintenance/retired status; resolve affected future operations first. |
| 080 | POST `/stops` | Transport | Code, name, address, optional landmark/zone, stop type | Create a bus stop or school gate. |
| 081 | GET `/stops` | Transport | Status/type/search filters | List text-based stops. Family options are provided separately. |
| 082 | GET `/stops/:id` | Transport | Stop details | Read one stop. |
| 083 | PATCH `/stops/:id` | Transport | Allowed name/address/landmark/zone/status | Preserve used stop identity/type; handle dependent routes before deactivation. |

### 09. Route design and versions

Collection: `routes`; dated changes can also replace assignments, enrollment segments, and future scheduled trips.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 084 | POST `/routes` | Transport | Year, shift, code, name, direction, weekdays, operating window, seat limit, dates, stops | Create a draft route; server sets initial version. |
| 085 | GET `/routes` | Transport, Crew | Year/shift/direction/status/effective-date filters | Transport sees school routes; crew sees assigned routes. |
| 086 | GET `/routes/:id` | Transport, Crew | Exact version, ordered stops, timetable | Read the route in permitted scope. |
| 087 | PATCH `/routes/:id` | Transport | Allowed draft fields | Edit while draft and unused; never rewrite a used route's schedule/stops. |
| 088 | POST `/routes/:id/activate` | Transport | No body fields | Validate stop order, times, dates, direction, and seat limit; activate the draft. |
| 089 | POST `/routes/:id/versions` | Transport | `effective_from`, new route plan, `reason` | Replace the future period with a new version and safe dependent replacements. See section 5. |
| 090 | POST `/routes/:id/retire` | Transport | `effective_on`, `reason` | End a used version only when future commitments are resolved. |
| 091 | POST `/routes/:id/cancel` | Transport | `reason` | Cancel an unused route that will not operate. |
| 092 | GET `/routes/:id/roster` | Transport, Crew | `service_date`, optional `stop_id` | Read permitted children for that route/date. Never give the full roster to a parent. |
| 093 | GET `/routes/:id/availability` | Transport | `valid_from`, `valid_to` | Show seat commitments and assignment gaps across the requested period. This does not reserve a seat. |

### 10. Route, bus, and crew assignments

Collection: `route_assignments`.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 094 | POST `/route-assignments` | Transport | `route_id`, `bus_id`, driver/attendant staff IDs, dates | Assign a complete crew and bus after checking capacity, license, date/day/time conflicts. |
| 095 | GET `/route-assignments` | Transport, Crew | Route/bus/staff/effective-date filters | Crew sees its assignments only. |
| 096 | GET `/route-assignments/:id` | Transport, Crew | One permitted assignment | Read assignment and date period. |
| 097 | POST `/route-assignments/:id/replace` | Transport | `effective_on`, new bus/driver/attendant IDs, `reason` | Close old assignment and create replacement together; refresh affected not-started trips and repeat pre-trip checks. |
| 098 | POST `/route-assignments/:id/end` | Transport | `effective_on`, `reason` | Close a started assignment; reject if future service would be left uncovered. |
| 099 | POST `/route-assignments/:id/cancel` | Transport | `reason` | Cancel an unstarted assignment only after resolving future dependencies. |

A bus/driver can serve morning and afternoon when the route windows do not overlap. Check staff across both driver and attendant fields. A change cannot modify a started trip's bus or crew.

### 11. Parent transport requests and staff decisions

Collections: `transport_requests`; approval creates `student_transport_enrollments`.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 100 | GET `/transport-options` | Family, Transport | `student_id`, service dates, direction | Return suitable active routes/stops and a seat-availability summary for the child's placement. No other families' records. |
| 101 | POST `/transport-requests` | Family | Student, academic enrollment, requested dates, journeys, optional note | Request one or both directions after admission. Server sets parent, request number, and requested state. |
| 102 | GET `/transport-requests` | Family, Transport | Student/status/date filters | Family sees requests for permitted children; transport sees school queue. |
| 103 | GET `/transport-requests/:id` | Family, Transport | Request and decision | Read within family/role scope. |
| 104 | PATCH `/transport-requests/:id` | Family requester | Dates/journeys/note | Edit only while requested. Waitlisted choices are changed through cancellation and a new request. |
| 105 | POST `/transport-requests/:id/start-review` | Transport | No body fields | Move requested/waitlisted to under-review. |
| 106 | POST `/transport-requests/:id/waitlist` | Transport | `review_note` | Record that service cannot yet be allocated. Reserves no seats. |
| 107 | POST `/transport-requests/:id/approve` | Transport | `allocations`: direction/route/stop per requested journey; optional `replaces_enrollment_id` per direction | Approve all directions and create segment 1 for each together; see section 5 for replacement service. |
| 108 | POST `/transport-requests/:id/reject` | Transport | `review_note` | Reject a request under review with a reason. |
| 109 | POST `/transport-requests/:id/cancel` | Family requester, Transport | `reason` | Cancel before approval/rejection. An approved request stays in decision history. |

Only the verified family chooses the requested stops/service period. Approval cannot silently change those choices. An optional preferred route is a preference; the actual route must serve the agreed stop, direction, shift, and dates. Staff availability checks cannot guarantee a seat until approval commits.

### 12. Approved student transport service

Collection: `student_transport_enrollments`. It is created by request approval or a controlled history-preserving replacement, not direct free-form CRUD.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 110 | GET `/transport-enrollments` | Family, Transport, Crew | Child/route/stop/direction/effective-date filters | Read allowed service records; crew only for assigned service. |
| 111 | GET `/transport-enrollments/:id` | Family, Transport, Crew | One permitted segment | Read approved stop, route, dates, and status. |
| 112 | POST `/transport-enrollments/:id/suspend` | Transport | `reason` | Pause service now while retaining the seat. |
| 113 | POST `/transport-enrollments/:id/resume` | Transport | `reason` | Revalidate placement, assignment, permissions, and dates before resuming. |
| 114 | POST `/transport-enrollments/:id/end` | Family with transport permission, Transport | `effective_on`, `reason` | Shorten service that began; keep historical dates and release future commitment. |
| 115 | POST `/transport-enrollments/:id/cancel` | Family with transport permission, Transport | `reason` | Cancel a service segment that never began. |

There is no endpoint to change the stop or route directly on an existing enrollment. A family change starts with a new request. A school-led route/class change creates the next `segment_no` under the existing approved request when its approved stop/service period remain the same. There can be only one committed segment for a child's direction on an overlapping date range. Suspension/resumption are immediate state changes in this version; advance scheduling of pauses is future scope.

### 13. Checklist templates

Collection: `checklist_templates`.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 116 | POST `/checklist-templates` | Transport | Code, title, stage, optional route, item keys/labels/required flags | Create initial draft version. |
| 117 | GET `/checklist-templates` | Transport, Crew | Route/stage/status filters | Crew reads applicable templates only. |
| 118 | GET `/checklist-templates/:id` | Transport, Crew | One permitted version | Read checklist wording. |
| 119 | PATCH `/checklist-templates/:id` | Transport | Allowed draft fields | Edit only unused draft templates. |
| 120 | POST `/checklist-templates/:id/versions` | Transport | New title/stage/route/items | Create a new draft version without editing old answers/templates. |
| 121 | POST `/checklist-templates/:id/activate` | Transport | No body fields | Activate this version and retire the previous active version of the same code together. |
| 122 | POST `/checklist-templates/:id/retire` | Transport | `reason` | Stop selection for new trips; saved trip template IDs remain valid. |

### 14. Manual trips and checklist results

Collections: `route_trips`, `trip_checklists`.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 123 | POST `/route-trips` | Transport, Crew | `route_id`, `service_date` | Create scheduled trip from the effective assignment and applicable template versions. Crew must be assigned for that date. |
| 124 | GET `/route-trips` | Transport, Crew; Family limited to child's service | Date/route/status filters | Return scoped trip summaries; family sees no roster or private crew information. |
| 125 | GET `/route-trips/:id` | Same scope as trip list | Trip status, planned route, permitted details | Show manual operational status only. |
| 126 | GET `/route-trips/:id/roster` | Transport, Crew | Children and stops for this trip | Provide the assigned day's working list; do not infer attendance from enrollment. |
| 127 | GET `/route-trips/:id/checklists` | Transport, Crew | Selected templates and any saved answers | Read all required checks for this trip. |
| 128 | PUT `/route-trips/:tripId/checklists/:templateId` | Crew | `items`: each template key and result; note when required | Save complete answers. Server copies wording/required flags and records actor/time. Locked after the related trip step. |
| 129 | POST `/route-trips/:id/start` | Crew | No body fields | Scheduled -> in-progress, only after required pre-trip checks pass. |
| 130 | POST `/route-trips/:id/complete` | Crew | No body fields | In-progress -> completed after required post-trip checks pass. |
| 131 | POST `/route-trips/:id/cancel` | Transport, Crew | `reason` | Cancel scheduled/interrupted trip; preserve any actual start and prior handover records. |

Trip actors and timestamps come from the server. A trip is unique by school, route version, and service date. Start/completion time is a manual operation record; it is not a GPS reading. Before start/completion, recheck current crew assignment, relevant staff/bus status, and checklist results. Bus handovers occur while the afternoon trip is in progress. Trip completion alone does not mark any child released or present.

### 15. Pickup people and child-specific permissions

Collections: `authorized_people`, `pickup_authorizations`.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 132 | POST `/authorized-people` | Family | Name, phone, optional own linked-parent reference and minimal identity note | Add a pickup person owned by this parent; no permission is created automatically. |
| 133 | GET `/authorized-people` | Family, Transport | Status/search filters | Family sees its own people; transport uses school verification scope. |
| 134 | GET `/authorized-people/:id` | Family owner, Transport; Gate staff for school identity review/handover; Attendant for assigned handover | Allowed identity details | Check a nominated person without exposing unrelated families; school identity review can happen before verification is complete. |
| 135 | PATCH `/authorized-people/:id` | Family owner | Name, phone, allowed identity details/status | Identity changes clear school verification and invalidate affected tokens until reverified. |
| 136 | POST `/authorized-people/:id/photo` | Family owner | Private image upload | Server controls storage reference; replacement clears identity verification. |
| 137 | GET `/authorized-people/:id/photo` | Same scope as person detail | Authorized private image | Stream a photo only after access checks. |
| 138 | POST `/authorized-people/:id/verify` | Transport, Gate staff | `reason` describing completed identity check | Record staff verification and time; no automatic approval by a parent. |
| 139 | POST `/pickup-authorizations` | Family with pickup permission | Child, owned person, relationship, contexts, validity period | Grant child-specific permission after checking the guardian link. |
| 140 | GET `/pickup-authorizations` | Family; Transport; Gate staff/Attendant for current handover | Child/person/status filters | Read only permitted grants and minimal identity details. |
| 141 | GET `/pickup-authorizations/:id` | Same scope as permission list | One permitted grant | Inspect dates, contexts, and current eligibility. |
| 142 | POST `/pickup-authorizations/:id/revoke` | Granting Family, Transport | `reason` | Revoke permission and affected outstanding tokens together. |

A family can nominate only a person record it owns. Linking `linked_parent_id` to another adult is a school-verified action, not a claim the parent may make merely by supplying an ID; initial family self-link is allowed only to its own profile. This first list does not offer arbitrary cross-family person linking. A new time period needs a new authorization; do not rewrite the dates of a used permission. School staff may stop unsafe access, but do not create a parent grant on an unverified family's behalf.

### 16. QR tokens and final child handover

Collections: `pickup_qr_tokens`, `student_pickup_events`.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 143 | POST `/pickup-qr-tokens` | Granting Family with pickup permission, Transport | `authorization_id`, context, service date, stop, trip for bus drop-off | Issue a short-lived token for the grant's child/person; replace prior active tokens for the same handover. |
| 144 | GET `/pickup-qr-tokens` | Granting Family, Transport | Child/date/status filters | Metadata only. Never recover the raw QR secret or return its hash. |
| 145 | POST `/pickup-qr-tokens/:id/revoke` | Granting Family, Transport | `reason` | Make an outstanding token unusable. |
| 146 | POST `/pickup-qr-tokens/verify` | Gate staff, Attendant | `qr_token` | Check gate/bus context and the attendant's assigned trip before showing minimal identity/eligibility details. Does not release the child or consume the token. |
| 147 | POST `/student-pickup-events` | Gate staff, Attendant | QR or manual handover input; `identity_check`, `operation_id`; see examples | Recheck all conditions and save one released/denied attempt. Staff/actual time/date come from the server. |
| 148 | GET `/student-pickup-events` | Family, Transport; Gate staff/Attendant in work scope | Child/date/context/outcome filters | Read permitted handover history. Family requires current verified student access. |
| 149 | GET `/student-pickup-events/:id` | Same scope as event list | Immutable event | Read one allowed handover result. |

For a school-gate handover, the verifier must be gate staff. For bus drop-off, it must be the assigned attendant, with an active `from_school` enrollment and an in-progress trip. A driver login alone cannot release a child. The actor is also the handover staff member in this version; a separate two-staff confirmation flow is not added.

For both QR and manual release, endpoint 147 requires the staff-selected `context`, `stop_id`, and `trip_id` for bus drop-off. The staff member confirms these match the physical handover. The server compares them with the authorization, QR binding when present, and enrollment; a token's stored stop alone is not confirmation of where the staff member is standing. This is a manual check and adds no tracking.

QR verification is only a preview. Final handover must recheck identity, current guardian permission, authorization period, person verification, token expiry/use, school, child, context, stop, date, trip, and enrollment under the protected transaction. One successful final release is allowed per child per school-local day, including manual releases. A suspended transport service cannot be used for bus handover.

Known denied attempts may be recorded with `outcome = denied` and a server-generated reason. A client cannot submit `outcome = released` to bypass checks. An unidentifiable QR value or invalid request returns a safe error and must not fabricate a student ID just to create an event. Failed attempts do not consume a token. Successful manual release requires the same permission checks, a reason, and audit; it revokes outstanding tokens for that child's day.

### 17. Settings, audit, and simple reports

Collections: `transport_settings`, `audit_logs`; reports read existing records without new collections.

| No. | Method and path | Who | Input / result | Purpose and rule |
|---|---|---|---|---|
| 150 | GET `/transport-settings` | Transport | Current school settings | Read the one settings document initialized at school setup. |
| 151 | PATCH `/transport-settings` | Transport | QR lifetime, manual-handover flag, attendant/checklist requirements | Validate values and future operations; cannot disable identity/guardian checks. |
| 152 | GET `/audit-logs` | School admin | Entity/action/actor/date filters | Read the school's important action history with safe redacted values. |
| 153 | GET `/reports/admissions` | Admissions | Year/status/date filters | Counts and permitted application/student summaries. |
| 154 | GET `/reports/transport` | Transport | Year/route/direction/effective-date filters | Seat commitments, waitlist counts, and enrolled-student summaries. |
| 155 | GET `/reports/trips` | Transport | Date-range/status filters | Manual trip/checklist completion and cancellation summary; no location metrics. |

Report list results are paginated; summary counts are derived from the same school-scoped filters. `/student-pickup-events` already provides handover history. Exports, charts, scheduled reports, and message delivery are separate future decisions.

## 5. Important actions explained step by step

### Admission approval

1. The admission officer opens an application under review.
2. The server checks the section, year, shift, available seats, proposed admission number, and roll number.
3. It creates the student, verified parent-child link, and academic enrollment.
4. It links the new student to the application and records approval and audit.
5. All changes commit together. A failure creates none of these partial records.

A retry of the same approved application with the same decision returns the existing IDs. A different decision sent after approval returns `409`. There is no separate client call to create the student or guardian after approval.

### Transport approval or a family-requested change

1. Read the request under review and verify the child, guardian, academic placement, and dates.
2. Require exactly one allocation for every requested direction. No missing or extra direction is accepted.
3. For a changed service, `replaces_enrollment_id` identifies the prior approved service for that direction. Find all future segments of that prior request/direction affected from the new start date, including later segments created by school-led changes. Close the segment crossing the new start date and cancel any affected segment that never begins. Recheck each row and preserve earlier history. Do not silently end an unrelated service. The new request defines the replacement service's complete remaining period; old later segments do not restart automatically.
4. Recheck route direction/year/shift, agreed stop, full assignment coverage, conflicts, and capacity on all affected operating dates.
5. Create segment 1 for every direction, mark the request approved, and write audit records together.

The old request remains approved in history. The new request expresses the family's changed choice. If one direction cannot be allocated, no direction is newly approved and no old service is ended. A retry returns the existing initial approval segments. A parent changing only one direction may request just that direction.

### A school-led route version or class transfer

1. Choose the first date of the change and check all dependent future records.
2. Keep past versions and periods. Create the new route version or class placement.
3. Split affected future transport into later `segment_no` values under the original approved request when the stop and approved dates stay the same.
4. For a new route version, replace affected future assignments and carry over or create applicable checklist versions for the new route. Use a separate route-specific checklist code if the old route still needs its active template before the change date. Revalidate bus/crew schedules and seat limits.
5. Cancel and replace affected not-started trips under the new route version; preserve historical trips. Never alter a started trip or its completed checks.
6. Commit the linked changes together and audit them. If a change needs a different agreed stop/service period, or valid assignments cannot be built, return `409` and resolve the family's new request first.

A same-route crew replacement can refresh not-started trips through the assignment-replacement action. It requires fresh pre-trip checks. The previous answers/change evidence remain in audit; a started trip's IDs and locked checklist answers cannot be overwritten.

### QR or manual handover

1. The staff member checks the person physically; a QR image is not sufficient identity proof.
2. The server verifies current permission and the bound handover context.
3. Derive `occurred_at` from the server and `service_date` from school-local time.
4. Check no successful release already exists for this child/day.
5. For QR success, atomically consume the unused token and create the successful event. For manual success, save the verified event and mandatory reason.
6. Revoke other outstanding tokens for the child/day and write audit records in the same transaction.

`operation_id` is required for endpoint 147. After checking current caller access, repeating the same operation with the same actor and semantic input returns the recorded event. Reusing it for another actor, child, token, method, or context returns `409`. A genuine new attempt after a denied attempt needs a new operation ID. The final unique child/day rule still prevents two different operations from releasing the child twice.

### Shared protection against simultaneous changes

Use the approved database plan's `schools.allocation_version` first-write rule for allocation-changing and sensitive permission/handover transactions. Repeat all checks after a transaction conflict; a read of a free seat followed by an unrelated insert is not enough. Unique indexes remain additional guards.

Audit `operation_id` values can group changes; they are not a new generic idempotency store. The documented approval/handover actions, unique trip/checklist writes, and matching state transitions use their stored identity and state for retry protection. Unkeyed creates, such as a new admission draft or pickup person, do not have a general replay guarantee: the client must check the result before creating again after an uncertain response. Do not claim every POST is retry-safe or silently add an idempotency collection. If a future endpoint needs durable arbitrary response replay beyond these rules, design that separately before implementation.

## 6. State changes allowed by these APIs

| Record | Normal action sequence |
|---|---|
| Application | Create draft -> submit -> start review -> approve or reject. Request changes -> parent edit -> resubmit is also allowed. Family can withdraw before final decision. |
| Transport request | Create requested -> start review -> approve, waitlist, or reject. Waitlist -> start review when seats become available. Family can cancel before final decision. |
| Academic placement | Created active -> completed at period end, withdrawn on early school exit, or cancelled if it never began. Transfer creates a replacement period. |
| Transport enrollment | Active -> suspended -> active; seat remains reserved. End service after it begins, or cancel before it begins. Dates still control eligibility. |
| Route | Draft -> active -> retired. A used plan changes through a new version; an unused plan can be cancelled. |
| Trip | Scheduled -> in_progress -> completed. Scheduled or interrupted trips may be cancelled with a reason. |
| Checklist template | Draft -> active -> retired. Each changed version is a new document. |
| Pickup authorization | Active until revoked or expired. Every use rechecks actual dates and current guardian permission. |
| QR token | Active -> used or revoked; expiry is checked at use even if a status-cleanup job has not run. |
| Pickup event / audit log | Created once and then read only. |

Any transition not listed must be rejected unless it is an explicitly documented retry returning the original result. A generic PATCH must not act as a hidden approval, reopen, or release endpoint.

## 7. Collection coverage

There are 28 approved collections. Some are created by a workflow rather than a standalone create API.

| Collection | Main API group / creation path |
|---|---|
| `schools` | Trusted initial setup; `/school` for reading/updating |
| `academic_years` | `/academic-years` |
| `shifts` | `/shifts` |
| `users` | Registration, staff/parent account attachment, and `/users` access management |
| `parents` | Registration, `/parents/me`, and offline `/parents` creation |
| `staff` | `/staff` |
| `classes` | `/classes` |
| `sections` | `/sections` |
| `teacher_assignments` | `/teacher-assignments` |
| `admission_applications` | `/admission-applications` |
| `students` | Admission approval; `/students` for allowed reads/corrections/exit |
| `student_guardians` | Admission approval; verified guardian-link actions |
| `student_academic_enrollments` | Admission approval and academic-placement actions |
| `buses` | `/buses` |
| `stops` | `/stops` |
| `routes` | `/routes` and route-version actions |
| `route_assignments` | `/route-assignments` |
| `transport_requests` | `/transport-requests` |
| `student_transport_enrollments` | Transport approval, route/class replacements, and service-state actions |
| `checklist_templates` | `/checklist-templates` |
| `route_trips` | `/route-trips` |
| `trip_checklists` | Trip checklist GET/PUT endpoints |
| `authorized_people` | `/authorized-people` |
| `pickup_authorizations` | `/pickup-authorizations` |
| `pickup_qr_tokens` | `/pickup-qr-tokens` |
| `student_pickup_events` | `/student-pickup-events` |
| `transport_settings` | Setup defaults; `/transport-settings` |
| `audit_logs` | Written by protected actions; `/audit-logs` for reading |

## 8. Suggested building order

The full catalog contains **155 proposed endpoints**. They are grouped so we can build and learn one flow at a time.

| Stage | Work | Small result to demonstrate |
|---|---|---|
| 1 | Trusted school/admin setup, authentication, parent profile | A parent registers and reads only their own profile. |
| 2 | Academic year, shift, class, section, staff | The school can prepare a class and office team. |
| 3 | Admission application and approval | An approved child gets exactly one student identity, guardian link, and placement. |
| 4 | Guardian changes, class history, teacher assignment | A teacher sees their own section; a parent sees linked children only. |
| 5 | Bus, stop, route, and dated crew assignment | A route has a suitable bus/driver/attendant without a schedule clash. |
| 6 | Transport request, approval, and service changes | One child gets morning and afternoon service without overbooking. |
| 7 | Checklist templates and manual trip flow | Assigned staff can complete checks and start/end a trip. |
| 8 | Verified pickup people, permission, QR/manual handover | One authorized person collects one child once for the day. |
| 9 | Reports and administrative history views | Staff can review decisions, service, and actions. |

School isolation, validation, audit writing, and the database's concurrency rules apply from stage 1; they are not postponed to the report stage. Endpoint numbers are a reading order, not a requirement to implement every API before demonstrating one flow.

## 9. Planning checks before coding

- Every endpoint has a defined caller and ownership scope.
- Initial student creation happens only through admission approval.
- Initial transport allocation happens only through request approval.
- Class/route/crew changes keep old periods and update future dependencies together.
- Public input cannot set privileged roles, audit fields, approval actors, or handover outcomes.
- A family with two children and a staff member who is also a parent are both supported.
- Single-use QR, manual fallback, denied attempts, and one final release/day follow the approved plan.
- No tracking, ETA, fees, new business collections, or implementation code is included.

The next implementation task can begin with stage 1 once the API choices are accepted. The [examples file](SCHOOL_ERP_API_EXAMPLES.md) shows the main request/response flow in simple JSON.
