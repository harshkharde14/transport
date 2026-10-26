# School ERP - Project Overview

Status: Project scope approved by you on 2026-10-18.

This document explains the project in simple English. The matching [Database Plan](SCHOOL_ERP_DATABASE_PLAN.md) explains the MongoDB collections, fields, and sample values.

The current work is planning only. The [API List](SCHOOL_ERP_API_LIST.md) and [API Examples](SCHOOL_ERP_API_EXAMPLES.md) build on the approved database plan. These API documents are proposed for review; the endpoints are not implemented by this documentation work.

## 1. What is this project?

ERP means Enterprise Resource Planning. In simple words, it is one system that helps a school keep its work and records in one place.

The first version of this project covers three main areas:

1. School setup, staff, parents, and children.
2. Admission and the student's class for each school year.
3. Optional school bus service and safe pickup records.

A parent can create an account and apply for a child's admission. School staff review the application. After approval, the child becomes a student in the school. The parent can then request school transport.

Transport is optional. A child can join the school without using a school bus.

This is the first part of a School ERP. Other school modules can be added later.

## 2. Simple words used in this project

| Word | Simple meaning | Example |
|---|---|---|
| Account | Login details used to enter the system. | A parent's email and password. |
| Parent profile | Information about the parent or guardian. | Name, phone number, and address. |
| Admission application | A request to join the school. | A parent applies for Class 2. |
| Student | A child whose admission the school has approved. | Anaya has admission number ADM-2026-001. |
| Academic year | One school year. | 2026-2027. |
| Class | The child's study level. | Class 2. |
| Section | A group of students in one class. | Class 2, Section A. |
| Academic enrollment | A student's class and section for one school year. | Anaya is in Class 2-A in 2026-2027. |
| Staff | People who work for the school. | Teacher, driver, or bus attendant. |
| Role | The kind of work a person can do in the system. | Admission officer or transport admin. |
| Bus attendant | A staff member who helps children on the bus. | We have understood "bus didi" to mean a bus attendant. |
| Stop | A fixed place where children board or leave a bus. | Green Park Gate. |
| Route | The ordered list of stops for a bus journey. | Green Park -> Lake Road -> School. |
| Shift | A school time group. | Morning school shift. |
| Direction | Whether the journey goes to school or from school. | Morning pickup or afternoon drop. |
| Assignment | A link between a route, bus, and staff for set dates. | Bus 12 and its driver serve Route R01 in July. |
| Transport request | A parent asks for bus service. | Bus service from Green Park. |
| Transport enrollment | Approved bus service for a student and date range. | Morning pickup at Green Park from 1 July. |
| Trip | One route journey on one date. | Route R01 morning journey on 1 July. |
| Checklist | A short list of checks that staff complete. | Check the first-aid box and check the empty bus. |
| Authorized pickup person | Someone allowed to collect a particular child. | The child's mother or approved uncle. |
| Audit record | A record of who changed something and when. | An admin changed a student's bus stop. |

## 3. Who uses the system?

| Person | What the person can do |
|---|---|
| School admin | Manage the school, school years, classes, sections, staff, and access rights. The admin can also review admissions and manage transport when given those roles. |
| Admission officer | Review applications, request corrections, approve or reject admission, and place students into classes and sections. |
| Parent or guardian | Register, manage their own profile, apply for their children, request transport, and view their own children's records. They can nominate pickup people for their children. |
| Teacher | View the students and classes assigned to them. Teaching, marks, and homework features are future work. |
| Transport admin | Manage buses, stops, routes, bus and staff assignments, requests, seats, and transport enrollments. |
| Driver | View assigned journeys and the information needed for the journey. Record permitted trip actions. |
| Bus attendant | View assigned journeys and children, complete checks, and record permitted child handovers. |
| Gatekeeper | Check the child and pickup person's permission, then record a handover. |

One staff member may have more than one role. A staff record does not automatically give login access. The school creates an account and gives suitable roles when login access is needed.

Parents cannot approve their own child's admission, confirm a bus seat, or create staff accounts. Staff see only the information needed for their work.

## 4. School boundaries

The database can hold more than one school. Each school has its own records. School A must never see School B's families, staff, or transport data.

For the first version, each login account belongs to one school. A parent chooses the school before registration. If the parent needs another school, that school has a separate account and profile.

The first school and its admin are set up by the project operator. The school admin then completes the school setup.

## 5. School setup flow

Steps 1 to 5 prepare the school for admissions. Steps 6 to 10 prepare transport and can be completed later:

1. Create the school and its first admin account.
2. Create the academic year, such as 2026-2027.
3. Create the class levels and school shifts, then create sections for that year.
4. Register teachers, admission staff, drivers, bus attendants, and gatekeepers.
5. Give login accounts and permissions to the staff who need them.
6. Register buses and their seat capacities.
7. Create bus stops and routes. Put the stops in journey order.
8. Set route working days and planned stop times.
9. Assign a bus, driver, and bus attendant to each route for a date range.
10. Add checklist templates and pickup rules.

Admission can operate before the bus setup is ready. A parent can request transport after admission and class placement are approved. The request can wait until routes and seats are available.

## 6. Parent registration and admission flow

```text
Parent selects the school
        |
Parent creates an account and parent profile
        |
Parent fills in a child's admission application
        |
Parent submits the application
        |
School reviews it and asks for corrections if needed
        |
School approves or rejects admission
        |
If approved: create the student and academic enrollment
```

The details are:

1. The parent enters their name, contact details, and login details.
2. The parent creates one application for one child and one academic year.
3. The parent adds the child's name, date of birth, requested class, and other required details.
4. The parent can save a draft and finish it later.
5. The parent submits the application for review.
6. Admission staff check the details. They may ask the parent to correct or add information.
7. Staff choose the approved class, section, and shift.
8. If admission is approved, the system creates the student record, verified parent-child link, and that year's academic enrollment together.
9. The application stays in the system as the admission history.

Parent registration and child admission are different steps. Creating a parent account does not admit the child. Submitting an application also does not admit the child.

An unsuccessful application must not create an active student. Staff check possible duplicate applications. If the child already has a student record in the same school, staff close the duplicate application with a reason. They use the existing student identity for any new academic placement.

### More than one child

A parent can submit separate applications for siblings using the same account. Each child has their own application, admission decision, student record, class, and transport service.

A student can be linked to more than one parent or guardian. Adding another guardian requires a school-checked link. Knowing a child's name or admission number is not enough to gain access.

### Admission states

| State | Simple meaning | Usual next step |
|---|---|---|
| Draft | The parent has not submitted the application. | Submit or withdraw. |
| Submitted | The parent has sent the application to the school. | Staff start review. |
| Under review | Staff are checking the application. | Ask for changes, approve, or reject. |
| Needs changes | Staff need a correction or more information. | Parent edits and submits again. |
| Approved | The school has accepted the child. | Student and academic enrollment are available. |
| Rejected | The school has not accepted the application. | Keep the decision and reason in history. |
| Withdrawn | The parent has cancelled the application before a final decision. | Keep it in history. |

An approved application is not later changed to withdrawn. Leaving school is handled through the student's enrollment record.

An academic enrollment can be active, completed, withdrawn, or cancelled. Cancelled means that the approved placement never began. Each placement also has a start and end date.

## 7. Optional transport flow

During admission, the parent can tick "Interested in transport." This only records interest. It does not create a transport request or reserve a bus seat.

The parent can submit a transport request only after admission is approved and the child has an active academic enrollment for the requested period.

```text
Child has approved admission and active academic enrollment
        |
Parent requests transport
        |
Transport admin checks route, stops, dates, and seats
        |
Admin approves available service
        |
Create the student's transport enrollment
```

1. The parent selects morning pickup, afternoon drop, or both.
2. The parent enters the desired service dates and preferred stops.
3. The transport admin checks that suitable routes and stops exist.
4. The admin checks the child's school year, shift, admission, and available seats.
5. If seats are available for all requested directions, the admin confirms the service.
6. If a seat is not available, the request can wait on a waiting list.
7. If the school cannot provide the service, the request is rejected with a reason.
8. The parent can view the result and the approved service details.

Morning pickup and afternoon drop are separate journeys. A child may use different stops or routes for them. Each approved direction has its own transport enrollment.

If one request asks for both directions, the school approves both together or keeps the request on the waiting list. The parent can make separate requests if they want a separate decision for each direction. A waiting-list request has no reserved seat.

A school shift and a bus direction are different things. For example, a child in the morning school shift can still need both a journey to school and a journey home.

If admission is rejected or withdrawn, no transport request can be created for that application.

### Transport states

| Record | States | Meaning |
|---|---|---|
| Transport request | Requested, under review, waitlisted, approved, rejected, cancelled. | Shows the decision about the parent's request. |
| Transport enrollment | Active, suspended, ended, cancelled. | Shows the student's approved service. The start and end dates also decide when it can be used. |

An approved request is the decision. The enrollment is the actual service record. These are kept separately so that later changes do not erase the original request.

Every transport request links to the student and their active academic enrollment for the requested school year.

### Changes during the year

If a parent wants to change the stop, route, or service dates, they submit a new request. After approval, end the old service for the correct date and create the new service. Keep the old record as history. A school-led route change can split the existing service into dated parts if the approved stop and service dates stay the same.

If a driver or bus changes, end the old assignment and add a new dated assignment. A later change must not change the saved details of a completed trip.

If the child's class placement changes, close the old transport service parts and create replacement parts linked to the new placement. Check the route and shift again, even if the child keeps the same bus.

Bus seats are checked for each route, direction, and service period. The same child must not have two active services for the same journey time. A bus or staff member must not be assigned to overlapping journeys.

Suspending service keeps the child's seat reserved. Ending or cancelling service releases the seat for future dates. Use cancellation only if the service has not started; after it starts, record an end date instead.

## 8. Daily transport work

The first version uses manual actions by staff.

1. Staff open the route journey for the service date.
2. The system keeps a copy of the bus and staff details used for that trip.
3. Staff complete the required checklist before leaving.
4. Authorized staff mark the trip as started.
5. Staff record permitted handover actions when needed.
6. Staff complete the final checks, such as checking that no child remains in the bus.
7. Authorized staff mark the trip as completed.

Trip states are scheduled, in progress, completed, or cancelled. These states come from staff actions.

The system does not know the bus's live location. An "in progress" trip only means that a staff member recorded its start.

A planned stop time, such as 7:30 AM, is a timetable. It is not an ETA. ETA means an estimate of when a bus will arrive based on its current journey. This version does not calculate ETA.

## 9. Safe child pickup

A parent with a verified active link to the child and pickup-management permission may nominate themselves, another guardian, or another trusted person to collect the child. The parent gives that person permission for a specific child, place, and date range.

The school verifies the pickup person's identity. The parent's permission and the school's identity check are both required. Permission for one child does not automatically give permission for another child. Even a parent collecting their own child needs a pickup permission record.

For a pickup:

1. Staff identify the child and the person collecting the child.
2. Staff check that the person has active pickup permission for that child and that the parent who gave it still has a valid verified link and pickup-management permission.
3. If a QR token is used, staff check that it is valid, unused, and for that child and pickup person.
4. Staff confirm the handover. The system records the child, person, staff member, time, and result.
5. The QR token becomes used. It cannot be used for a second handover.

A QR image by itself is not permission to collect a child. An expired or removed permission must fail even if the QR token has not expired.

An afternoon bus handover also requires the child's active transport service, the correct stop, and an afternoon trip that is in progress.

If QR scanning is unavailable, authorized staff can use a manual process. They must still check the person's identity and permission, enter a reason, and save an audit record.

These records confirm a handover. They are not live tracking or a full student attendance system.

The first version allows only one successful final handover per child per school day. A school-gate handover prevents another bus handover that day. Returning to school and leaving again on the same day is future scope.

## 10. Moving to the next school year

The child keeps the same student identity and admission number.

1. The school creates the next academic year and its sections. Existing class levels and school shifts are reused unless the school needs new ones.
2. Staff review each student's promotion, repeat year, or school exit.
3. Staff create a new academic enrollment for students who continue.
4. The previous year's enrollment stays in history.
5. Routes, assignments, and transport enrollments are reviewed for the new year.
6. Staff confirm new transport service. Old service does not continue automatically without a review.

A normal promotion does not need a new admission application. A student who leaves the school also needs their future transport service to be ended or cancelled.

## 11. One simple example

Green Valley School opens admissions for 2026-2027.

Priya creates a parent account. She applies for admission for her daughter Anaya in Class 2. Priya ticks "Interested in transport" on the admission application.

At this point, Anaya has an application. She is not yet an admitted student. There is no transport request or confirmed bus seat.

The admission officer checks the application and approves Class 2-A. The system creates Anaya's student record, Priya's verified parent-child link, and Anaya's 2026-2027 academic enrollment.

Priya now requests morning pickup from Green Park and afternoon drop at Lake Road. The transport admin finds seats on both suitable routes. The admin approves both directions together and creates two service records: one for morning pickup and one for afternoon drop.

Bus 12, driver Ravi, and bus attendant Meena are assigned for the service dates. Meena completes the checklist. Ravi marks the morning trip as started and later completed.

Priya nominates Anaya's uncle Arun as a pickup person and gives him permission to collect Anaya. The school verifies Arun's identity. At the afternoon bus stop, the staff member checks Arun's identity, current permission, and single-use QR token. The system saves the day's final handover record.

Priya later applies for her younger son using her existing account. Her son's admission and transport decisions are separate from Anaya's.

Next year, Anaya keeps the same student record. Staff create her new class enrollment and review her bus service.

## 12. What is included now?

- School records and school data separation.
- Parent registration and login accounts.
- Child admission applications and school decisions.
- Students, parent links, classes, sections, shifts, and academic history.
- Staff registration, roles, and class assignments for teachers.
- Buses, stops, routes, timetables, and dated bus and staff assignments.
- Transport requests, seat checks, and student transport enrollments.
- Manual trip start and completion.
- Bus safety checklists.
- Authorized pickup people, pickup permissions, QR tokens, and handover records.
- Records of important changes and actions.

## 13. What is outside this version?

- Live GPS tracking, live bus location, maps, ETA, and geofencing.
- Movement history, location streams, and automatic stop-arrival records.
- Admission fees, transport fees, online payments, invoices, and accounts.
- Exams, marks, homework, and lesson planning.
- Payroll, library, hostel, and inventory modules.
- Full classroom attendance and full bus boarding attendance.
- A child returning to school and having a second final handover on the same day.
- Automatic SMS, email, or WhatsApp messages.
- One login that switches between multiple schools.
- Importing old SQL data unless it is requested later.

These features can be planned separately in the future. They are not required to complete this version.

## 14. Approved planning decisions

You approved the following choices as the starting scope on 2026-10-18.

| Choice | Approved behavior |
|---|---|
| School model | One database can contain many schools. Every school keeps its data separate. |
| Account model | Each account belongs to one school. Login details are separate from parent and staff profiles. |
| Admission | A parent can apply online. School approval is required before the child becomes a student. |
| Academic placement | Admission approval creates the student, verified parent-child link, and the year's class placement together. The section gives the class and shift. |
| Siblings | One parent account can manage more than one child. Each child has a separate admission application. |
| Transport timing | Before admission, the parent can record interest only. A transport request requires approved admission and active academic placement. |
| Journey directions | Morning pickup and afternoon drop can use different routes and stops. |
| Two directions in one request | Approve both together or keep the request on the waiting list. Separate requests can receive separate decisions. |
| Suspended transport | Keep the seat reserved. End or cancel service to release the seat for future dates. |
| History | Keep old academic enrollments, service enrollments, and assignments when a new one starts. |
| Pickup permission | The parent gives child-specific permission. The school verifies the pickup person's identity. QR and manual pickup require both, plus the parent's current verified link and permission to manage pickup. |
| Final handover | Allow one successful final handover per child per school day. Re-entry is future scope. |
| Trip updates | Staff enter start, completion, and checklist results manually. There is no tracking or ETA. |
| Fees and other ERP modules | Plan these later. This version does not collect payments or calculate fees. |

Read the approved [Database Plan](SCHOOL_ERP_DATABASE_PLAN.md) for each collection and its sample fields. Continue with the proposed [API List](SCHOOL_ERP_API_LIST.md) in business order and the [API Examples](SCHOOL_ERP_API_EXAMPLES.md) for sample requests and responses. API planning does not mean that the APIs have been built.
