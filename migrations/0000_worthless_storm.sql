CREATE TYPE "public"."action_status" AS ENUM('none', 'open', 'in_progress', 'complete', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."change_status" AS ENUM('draft', 'impact_analysis', 'auto_review', 'pending_signatures', 'effective', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."control_category" AS ENUM('error_proofing_prevent', 'error_proofing_detect', 'automated_100_percent', 'spc_immediate', 'manual_gage', 'visual_standard', 'visual_only', 'none');--> statement-breakpoint
CREATE TYPE "public"."control_effectiveness" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."control_type" AS ENUM('prevention', 'detection');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('procedure', 'work_instruction', 'form', 'specification', 'standard', 'drawing', 'customer_spec', 'external', 'policy', 'record');--> statement-breakpoint
CREATE TYPE "public"."effect_category" AS ENUM('safety_no_warning', 'safety_with_warning', 'regulatory_noncompliance', 'function_loss', 'function_degraded', 'comfort_loss', 'comfort_reduced', 'appearance_obvious', 'appearance_subtle', 'appearance_minor', 'none');--> statement-breakpoint
CREATE TYPE "public"."failure_mode_category" AS ENUM('dimensional', 'visual', 'functional', 'assembly', 'material', 'process', 'contamination', 'environmental');--> statement-breakpoint
CREATE TYPE "public"."finding_category" AS ENUM('coverage', 'effectiveness', 'document_control', 'scoring', 'csr');--> statement-breakpoint
CREATE TYPE "public"."finding_level" AS ENUM('error', 'warning', 'info');--> statement-breakpoint
CREATE TYPE "public"."msa_status" AS ENUM('approved', 'planned', 'failed', 'not_required');--> statement-breakpoint
CREATE TYPE "public"."process_symbol" AS ENUM('operation', 'inspection', 'storage', 'transportation', 'decision', 'cqt');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('library_maintainer', 'part_engineer', 'qe', 'process_owner', 'quality_manager', 'auditor');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('draft', 'review', 'effective', 'superseded', 'obsolete');--> statement-breakpoint
CREATE TYPE "public"."step_type" AS ENUM('operation', 'group', 'subprocess_ref');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'quality_manager', 'engineer', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'pending');--> statement-breakpoint
CREATE TABLE "action_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"pfmea_row_id" uuid NOT NULL,
	"action_type" text NOT NULL,
	"description" text NOT NULL,
	"responsible_person" text NOT NULL,
	"responsible_role" text,
	"target_date" timestamp NOT NULL,
	"completed_date" timestamp,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"completion_notes" text,
	"evidence_description" text,
	"evidence_attachment" text,
	"verified_by" text,
	"verified_date" timestamp,
	"verification_notes" text,
	"new_severity" integer,
	"new_occurrence" integer,
	"new_detection" integer,
	"new_ap" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_workflow_definition" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"applies_to_doc_types" text DEFAULT '[]',
	"applies_to_categories" text DEFAULT '[]',
	"steps" text NOT NULL,
	"allow_parallel_steps" integer DEFAULT 0,
	"require_all_signatures" integer DEFAULT 1,
	"auto_obsolete_previous" integer DEFAULT 1,
	"status" text DEFAULT 'active',
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_workflow_instance" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"workflow_definition_id" integer NOT NULL,
	"document_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"status" text DEFAULT 'active',
	"current_step" integer DEFAULT 1,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"due_date" timestamp,
	"initiated_by" text NOT NULL,
	"cancelled_by" text,
	"cancelled_at" timestamp,
	"cancellation_reason" text
);
--> statement-breakpoint
CREATE TABLE "approval_workflow_step" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_instance_id" integer NOT NULL,
	"step_number" integer NOT NULL,
	"step_name" text NOT NULL,
	"assigned_to" text,
	"assigned_role" text,
	"assigned_at" timestamp,
	"due_date" timestamp,
	"delegated_from" text,
	"delegated_at" timestamp,
	"delegation_reason" text,
	"status" text DEFAULT 'pending',
	"action_taken" text,
	"action_by" text,
	"action_at" timestamp,
	"comments" text,
	"signature_required" integer DEFAULT 0,
	"signature_captured" integer DEFAULT 0,
	"signature_data" text,
	"reminder_sent_at" timestamp,
	"escalation_sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"actor" uuid NOT NULL,
	"actor_name" text,
	"at" timestamp DEFAULT now() NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb,
	"change_note" text,
	"ip_address" text,
	"session_id" text,
	"payload_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "auto_review_finding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_run_id" uuid NOT NULL,
	"level" text NOT NULL,
	"category" text NOT NULL,
	"rule_id" text NOT NULL,
	"message" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp,
	"resolution" text,
	"waived" boolean DEFAULT false NOT NULL,
	"waiver_reason" text
);
--> statement-breakpoint
CREATE TABLE "auto_review_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pfmea_id" uuid,
	"control_plan_id" uuid,
	"total_findings" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"warning_count" integer DEFAULT 0 NOT NULL,
	"info_count" integer DEFAULT 0 NOT NULL,
	"passed_validation" boolean DEFAULT false NOT NULL,
	"run_by" text,
	"run_at" timestamp DEFAULT now() NOT NULL,
	"duration_ms" integer,
	"ruleset_version" text DEFAULT '1.0.0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calibration_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gage_id" uuid NOT NULL,
	"calib_due" timestamp NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capa" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'd0_awareness' NOT NULL,
	"current_discipline" text DEFAULT 'D0' NOT NULL,
	"source_type" text NOT NULL,
	"source_id" integer,
	"category" text,
	"subcategory" text,
	"product_line" text,
	"part_numbers" text DEFAULT '[]',
	"process_ids" text DEFAULT '[]',
	"plant_location" text,
	"customer_name" text,
	"customer_part_number" text,
	"date_occurred" timestamp,
	"date_discovered" timestamp DEFAULT now(),
	"date_reported" timestamp,
	"target_closure_date" timestamp,
	"actual_closure_date" timestamp,
	"recurrence_check" integer DEFAULT 0,
	"recurrence_check_date" timestamp,
	"recurrence_result" text,
	"effectiveness_verified" integer DEFAULT 0,
	"effectiveness_date" timestamp,
	"effectiveness_result" text,
	"cost_of_quality" real,
	"cost_breakdown" text DEFAULT '{}',
	"risk_level" text,
	"approval_status" text DEFAULT 'draft',
	"approved_by" text,
	"approved_at" timestamp,
	"closed_by" text,
	"closed_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "capa_analysis_tool" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"tool_type" text NOT NULL,
	"name" text,
	"discipline" text,
	"data" text DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'in_progress',
	"conclusion" text,
	"linked_to_root_cause" integer DEFAULT 0,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"completed_by" text,
	"verified_at" timestamp,
	"verified_by" text
);
--> statement-breakpoint
CREATE TABLE "capa_attachment" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"discipline" text,
	"attachment_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_name" text NOT NULL,
	"original_name" text NOT NULL,
	"file_type" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"storage_path" text NOT NULL,
	"storage_provider" text DEFAULT 'local',
	"checksum_sha256" text NOT NULL,
	"thumbnail_path" text,
	"is_evidence" integer DEFAULT 0,
	"evidence_description" text,
	"evidence_collected_at" timestamp,
	"evidence_collected_by" text,
	"evidence_chain_of_custody" text DEFAULT '[]',
	"linked_document_id" integer,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"deleted_by" text,
	"deletion_reason" text
);
--> statement-breakpoint
CREATE TABLE "capa_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"discipline" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"user_id" text NOT NULL,
	"user_name" text,
	"user_role" text,
	"timestamp" timestamp DEFAULT now(),
	"previous_value" text,
	"new_value" text,
	"change_description" text,
	"ip_address" text,
	"user_agent" text,
	"session_id" text,
	"log_hash" text,
	"previous_log_hash" text
);
--> statement-breakpoint
CREATE TABLE "capa_d0_emergency" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"emergency_response_required" integer DEFAULT 0 NOT NULL,
	"response_type" text,
	"immediate_threat" text,
	"threat_level" text DEFAULT 'none',
	"safety_impact" integer DEFAULT 0,
	"safety_description" text,
	"regulatory_impact" integer DEFAULT 0,
	"regulatory_body" text,
	"regulatory_deadline" timestamp,
	"regulatory_submitted_at" timestamp,
	"customer_notification_required" integer DEFAULT 0,
	"customer_notified_at" timestamp,
	"customer_notified_by" text,
	"customer_response" text,
	"stop_shipment_issued" integer DEFAULT 0,
	"stop_shipment_scope" text,
	"stop_shipment_issued_at" timestamp,
	"stop_shipment_issued_by" text,
	"stop_shipment_lifted_at" timestamp,
	"stop_shipment_lifted_by" text,
	"emergency_actions" text DEFAULT '[]',
	"quantity_at_risk" integer,
	"quantity_contained" integer,
	"containment_locations" text DEFAULT '[]',
	"initial_sort_required" integer DEFAULT 0,
	"sort_method" text,
	"sort_results" text DEFAULT '{}',
	"symptoms_captured" integer DEFAULT 0,
	"symptoms_description" text,
	"d0_completed_at" timestamp,
	"d0_completed_by" text,
	"d0_verified_at" timestamp,
	"d0_verified_by" text,
	"d0_notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capa_d1_team_detail" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"team_formation_date" timestamp,
	"team_formation_method" text,
	"team_charter_defined" integer DEFAULT 0,
	"team_charter_document" text,
	"team_objective" text,
	"team_scope" text,
	"team_boundaries" text,
	"communication_plan" text DEFAULT '{}',
	"meeting_schedule" text DEFAULT '[]',
	"escalation_path" text DEFAULT '[]',
	"resources_required" text DEFAULT '[]',
	"resources_approved" integer DEFAULT 0,
	"resources_approved_by" text,
	"resources_approved_at" timestamp,
	"skills_gap_identified" text DEFAULT '[]',
	"skills_gap_addressed" integer DEFAULT 0,
	"team_effectiveness_score" integer,
	"team_effectiveness_notes" text,
	"d1_completed_at" timestamp,
	"d1_completed_by" text,
	"d1_verified_at" timestamp,
	"d1_verified_by" text,
	"d1_notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capa_d2_problem" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"problem_statement" text NOT NULL,
	"problem_statement_verified" integer DEFAULT 0,
	"problem_statement_verified_by" text,
	"object_description" text,
	"defect_description" text,
	"is_not_what" text DEFAULT '{}',
	"where_geographic" text,
	"where_on_object" text,
	"is_not_where" text DEFAULT '{}',
	"when_first_observed" timestamp,
	"when_pattern" text,
	"when_lifecycle" text,
	"is_not_when" text DEFAULT '{}',
	"how_many_units" integer,
	"how_many_defects" integer,
	"how_many_trend" text,
	"is_not_how_many" text DEFAULT '{}',
	"distinctions_summary" text,
	"changes_summary" text,
	"problem_extent" text,
	"problem_impact" text,
	"five_ws_complete" integer DEFAULT 0,
	"data_collection_plan" text DEFAULT '{}',
	"data_collected" text DEFAULT '[]',
	"measurement_system_valid" integer DEFAULT 0,
	"measurement_system_notes" text,
	"d2_completed_at" timestamp,
	"d2_completed_by" text,
	"d2_verified_at" timestamp,
	"d2_verified_by" text,
	"d2_notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capa_d3_containment" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"containment_required" integer DEFAULT 1 NOT NULL,
	"containment_not_required_reason" text,
	"containment_strategy" text,
	"containment_scope" text DEFAULT '{}',
	"containment_locations" text DEFAULT '[]',
	"actions" text DEFAULT '[]',
	"verification_method" text,
	"verification_frequency" text,
	"verification_results" text DEFAULT '[]',
	"containment_effective" integer DEFAULT 0,
	"containment_effective_date" timestamp,
	"containment_effective_evidence" text,
	"quantity_inspected" integer DEFAULT 0,
	"quantity_passed" integer DEFAULT 0,
	"quantity_failed" integer DEFAULT 0,
	"quantity_reworked" integer DEFAULT 0,
	"quantity_scrapped" integer DEFAULT 0,
	"quantity_on_hold" integer DEFAULT 0,
	"wip" text DEFAULT '{}',
	"finished_goods" text DEFAULT '{}',
	"in_transit" text DEFAULT '{}',
	"at_customer" text DEFAULT '{}',
	"supplier_containment" text DEFAULT '{}',
	"sorting_instructions" text,
	"sorting_training" integer DEFAULT 0,
	"sorting_start_date" timestamp,
	"sorting_end_date" timestamp,
	"cost_of_containment" real DEFAULT 0,
	"cost_breakdown" text DEFAULT '{}',
	"customer_approval_required" integer DEFAULT 0,
	"customer_approval_received" integer DEFAULT 0,
	"customer_approval_date" timestamp,
	"customer_approval_reference" text,
	"exit_criteria" text,
	"exit_criteria_met" integer DEFAULT 0,
	"exit_criteria_met_date" timestamp,
	"transition_to_permanent" text,
	"d3_completed_at" timestamp,
	"d3_completed_by" text,
	"d3_verified_at" timestamp,
	"d3_verified_by" text,
	"d3_notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capa_d4_root_cause" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"analysis_approach" text DEFAULT '[]',
	"possible_causes" text DEFAULT '[]',
	"five_why_analysis" text DEFAULT '[]',
	"fishbone_diagram" text DEFAULT '{}',
	"fault_tree_analysis" text DEFAULT '{}',
	"is_is_not_conclusions" text,
	"data_analysis" text DEFAULT '[]',
	"experiments_conducted" text DEFAULT '[]',
	"verification_tests" text DEFAULT '[]',
	"root_cause_occurrence" text,
	"root_cause_occurrence_evidence" text,
	"root_cause_occurrence_verified" integer DEFAULT 0,
	"root_cause_occurrence_verified_by" text,
	"root_cause_occurrence_verified_at" timestamp,
	"root_cause_escape" text,
	"root_cause_escape_evidence" text,
	"root_cause_escape_verified" integer DEFAULT 0,
	"root_cause_escape_verified_by" text,
	"root_cause_escape_verified_at" timestamp,
	"escape_point" text,
	"escape_point_analysis" text,
	"systemic_causes" text DEFAULT '[]',
	"contributing_factors" text DEFAULT '[]',
	"human_factors_analysis" text DEFAULT '{}',
	"equipment_factors_analysis" text DEFAULT '{}',
	"material_factors_analysis" text DEFAULT '{}',
	"method_factors_analysis" text DEFAULT '{}',
	"environment_factors_analysis" text DEFAULT '{}',
	"root_cause_summary" text,
	"confidence_level" text,
	"additional_investigation_needed" integer DEFAULT 0,
	"additional_investigation_plan" text,
	"d4_completed_at" timestamp,
	"d4_completed_by" text,
	"d4_verified_at" timestamp,
	"d4_verified_by" text,
	"d4_notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capa_d4_root_cause_candidate" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"d4_id" integer NOT NULL,
	"cause_type" text NOT NULL,
	"category" text,
	"description" text NOT NULL,
	"source" text,
	"evidence_for" text DEFAULT '[]',
	"evidence_against" text DEFAULT '[]',
	"likelihood" text DEFAULT 'medium',
	"verification_method" text,
	"verification_result" text,
	"verified_at" timestamp,
	"verified_by" text,
	"is_root_cause" integer DEFAULT 0,
	"linked_to_5why" text,
	"linked_to_fishbone" text,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capa_d5_corrective_action" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"corrective_actions_selected" text DEFAULT '[]',
	"alternatives_considered" text DEFAULT '[]',
	"selection_criteria" text DEFAULT '{}',
	"occurrence_action_summary" text,
	"escape_action_summary" text,
	"risk_assessment" text DEFAULT '{}',
	"implementation_plan" text DEFAULT '{}',
	"resource_requirements" text DEFAULT '{}',
	"resources_approved" integer DEFAULT 0,
	"resources_approved_by" text,
	"resources_approved_at" timestamp,
	"timeline" text DEFAULT '[]',
	"dependencies" text DEFAULT '[]',
	"potential_obstacles" text DEFAULT '[]',
	"contingency_plan" text,
	"pfmea_updates_required" integer DEFAULT 0,
	"pfmea_update_plan" text,
	"control_plan_updates_required" integer DEFAULT 0,
	"control_plan_update_plan" text,
	"document_updates_required" integer DEFAULT 0,
	"document_update_list" text DEFAULT '[]',
	"training_required" integer DEFAULT 0,
	"training_plan" text DEFAULT '{}',
	"customer_approval_required" integer DEFAULT 0,
	"customer_approval_status" text,
	"customer_approval_date" timestamp,
	"customer_approval_notes" text,
	"management_approval_required" integer DEFAULT 1,
	"management_approval_status" text,
	"management_approved_by" text,
	"management_approved_at" timestamp,
	"estimated_cost" real,
	"estimated_savings" real,
	"estimated_payback_months" integer,
	"d5_completed_at" timestamp,
	"d5_completed_by" text,
	"d5_verified_at" timestamp,
	"d5_verified_by" text,
	"d5_notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capa_d6_validation" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"implementation_status" text DEFAULT 'not_started',
	"implementation_progress" integer DEFAULT 0,
	"implementation_log" text DEFAULT '[]',
	"actions_implemented" text DEFAULT '[]',
	"actions_pending" text DEFAULT '[]',
	"delays_encountered" text DEFAULT '[]',
	"deviations_from_plan" text DEFAULT '[]',
	"containment_removed" integer DEFAULT 0,
	"containment_removed_at" timestamp,
	"containment_removal_verified_by" text,
	"pre_implementation_baseline" text DEFAULT '{}',
	"post_implementation_data" text DEFAULT '{}',
	"validation_plan" text DEFAULT '{}',
	"validation_tests" text DEFAULT '[]',
	"validation_results" text DEFAULT '[]',
	"statistical_validation" text DEFAULT '{}',
	"effectiveness_check_date" timestamp,
	"effectiveness_check_period" text,
	"effectiveness_metric" text,
	"effectiveness_target" text,
	"effectiveness_actual" text,
	"effectiveness_verified" integer DEFAULT 0,
	"effectiveness_verified_by" text,
	"effectiveness_verified_at" timestamp,
	"effectiveness_result" text,
	"effectiveness_evidence" text,
	"reoccurrence_check" integer DEFAULT 0,
	"reoccurrence_check_date" timestamp,
	"reoccurrence_check_method" text,
	"pfmea_updated" integer DEFAULT 0,
	"pfmea_update_details" text,
	"control_plan_updated" integer DEFAULT 0,
	"control_plan_update_details" text,
	"documents_updated" text DEFAULT '[]',
	"training_completed" integer DEFAULT 0,
	"training_records" text DEFAULT '[]',
	"customer_notified" integer DEFAULT 0,
	"customer_notification_date" timestamp,
	"customer_acceptance" text,
	"lessons_learned" text DEFAULT '[]',
	"d6_completed_at" timestamp,
	"d6_completed_by" text,
	"d6_verified_at" timestamp,
	"d6_verified_by" text,
	"d6_notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capa_d7_preventive" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"systemic_analysis_complete" integer DEFAULT 0,
	"systemic_analysis_summary" text,
	"management_systems_reviewed" text DEFAULT '[]',
	"similar_processes_identified" text DEFAULT '[]',
	"similar_products_identified" text DEFAULT '[]',
	"other_plants_identified" text DEFAULT '[]',
	"horizontal_deployment_plan" text DEFAULT '{}',
	"preventive_actions" text DEFAULT '[]',
	"policy_changes_required" integer DEFAULT 0,
	"policy_changes" text DEFAULT '[]',
	"procedure_changes_required" integer DEFAULT 0,
	"procedure_changes" text DEFAULT '[]',
	"system_changes_required" integer DEFAULT 0,
	"system_changes" text DEFAULT '[]',
	"design_changes_required" integer DEFAULT 0,
	"design_changes" text DEFAULT '[]',
	"supplier_actions_required" integer DEFAULT 0,
	"supplier_actions" text DEFAULT '[]',
	"fmea_system_review_complete" integer DEFAULT 0,
	"fmea_system_review_notes" text,
	"lesson_learned_created" integer DEFAULT 0,
	"lesson_learned_reference" text,
	"knowledge_base_updated" integer DEFAULT 0,
	"knowledge_base_entries" text DEFAULT '[]',
	"training_materials_updated" integer DEFAULT 0,
	"training_materials_list" text DEFAULT '[]',
	"audit_checklist_updated" integer DEFAULT 0,
	"audit_checklist_changes" text,
	"standardization_complete" integer DEFAULT 0,
	"standardization_summary" text,
	"preventive_action_verification" text DEFAULT '[]',
	"d7_completed_at" timestamp,
	"d7_completed_by" text,
	"d7_verified_at" timestamp,
	"d7_verified_by" text,
	"d7_notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capa_d8_closure" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"closure_criteria_met" integer DEFAULT 0,
	"closure_criteria_checklist" text DEFAULT '{}',
	"all_actions_complete" integer DEFAULT 0,
	"actions_completion_summary" text,
	"effectiveness_confirmed" integer DEFAULT 0,
	"effectiveness_summary" text,
	"no_recurrence" integer DEFAULT 0,
	"recurrence_monitoring_period" text,
	"containment_removed" integer DEFAULT 0,
	"containment_removal_date" timestamp,
	"documentation_complete" integer DEFAULT 0,
	"documentation_checklist" text DEFAULT '{}',
	"customer_closed" integer DEFAULT 0,
	"customer_closure_date" timestamp,
	"customer_closure_reference" text,
	"customer_feedback" text,
	"team_recognition" text DEFAULT '{}',
	"team_recognition_date" timestamp,
	"team_recognition_method" text,
	"team_feedback" text DEFAULT '[]',
	"lessons_learned_summary" text,
	"lessons_learned_shared" integer DEFAULT 0,
	"lessons_learned_audience" text DEFAULT '[]',
	"success_metrics" text DEFAULT '{}',
	"cost_savings_realized" real,
	"cost_of_quality_reduction" real,
	"cycle_time_days" integer,
	"on_time_completion" integer DEFAULT 0,
	"final_report" text DEFAULT '{}',
	"final_report_document_id" integer,
	"archive_complete" integer DEFAULT 0,
	"archive_location" text,
	"closed_by" text,
	"closed_at" timestamp,
	"approved_by" text,
	"approved_at" timestamp,
	"d8_completed_at" timestamp,
	"d8_completed_by" text,
	"d8_verified_at" timestamp,
	"d8_verified_by" text,
	"d8_notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capa_metric_snapshot" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"snapshot_period" text NOT NULL,
	"total_capas" integer DEFAULT 0,
	"by_status" text DEFAULT '{}',
	"by_priority" text DEFAULT '{}',
	"by_source_type" text DEFAULT '{}',
	"by_category" text DEFAULT '{}',
	"by_discipline" text DEFAULT '{}',
	"opened_this_period" integer DEFAULT 0,
	"closed_this_period" integer DEFAULT 0,
	"overdue_count" integer DEFAULT 0,
	"avg_age_days" real DEFAULT 0,
	"avg_cycle_time_days" real DEFAULT 0,
	"on_time_closure_rate" real DEFAULT 0,
	"effectiveness_rate" real DEFAULT 0,
	"recurrence_rate" real DEFAULT 0,
	"containment_effectiveness_rate" real DEFAULT 0,
	"customer_capa_count" integer DEFAULT 0,
	"safety_capa_count" integer DEFAULT 0,
	"top_failure_modes" text DEFAULT '[]',
	"top_root_causes" text DEFAULT '[]',
	"cost_of_quality" real DEFAULT 0,
	"cost_savings" real DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capa_number_sequence" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	"prefix" text DEFAULT 'CAPA',
	"format" text DEFAULT '{prefix}-{year}-{seq:4}',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capa_related_record" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"related_type" text NOT NULL,
	"related_id" integer NOT NULL,
	"relationship_type" text NOT NULL,
	"relationship_description" text,
	"linked_at" timestamp DEFAULT now(),
	"linked_by" text NOT NULL,
	"verified_at" timestamp,
	"verified_by" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "capa_source" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"source_type" text NOT NULL,
	"source_system" text,
	"external_id" text,
	"external_url" text,
	"customer_complaint_number" text,
	"ncr_number" text,
	"audit_id" text,
	"audit_type" text,
	"audit_finding_category" text,
	"supplier_name" text,
	"supplier_code" text,
	"pfmea_id" integer,
	"pfmea_row_id" integer,
	"control_plan_id" integer,
	"process_deviation_id" text,
	"original_report_date" timestamp,
	"original_reporter" text,
	"original_reporter_contact" text,
	"quantity_affected" integer,
	"lot_numbers" text DEFAULT '[]',
	"serial_numbers" text DEFAULT '[]',
	"date_code_range" text,
	"shipment_info" text DEFAULT '{}',
	"received_condition" text,
	"initial_assessment" text,
	"evidence_collected" text DEFAULT '[]',
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capa_team_member" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capa_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_email" text,
	"role" text NOT NULL,
	"department" text,
	"expertise" text,
	"responsibilities" text,
	"time_commitment" text,
	"is_champion" integer DEFAULT 0,
	"is_leader" integer DEFAULT 0,
	"joined_at" timestamp DEFAULT now(),
	"left_at" timestamp,
	"left_reason" text,
	"notifications_enabled" integer DEFAULT 1,
	"last_activity_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "change_package" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "change_status" DEFAULT 'draft' NOT NULL,
	"reason_code" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"target_entity_type" text NOT NULL,
	"target_entity_id" uuid NOT NULL,
	"before_snapshot" jsonb,
	"after_snapshot" jsonb,
	"redline_json" jsonb DEFAULT '{}'::jsonb,
	"impact_analysis" jsonb,
	"auto_review_id" uuid,
	"auto_review_passed" boolean,
	"approver_matrix" jsonb DEFAULT '[]'::jsonb,
	"initiated_by" text NOT NULL,
	"initiated_at" timestamp DEFAULT now() NOT NULL,
	"effective_from" timestamp,
	"completed_at" timestamp,
	"propagation_mode" text DEFAULT 'prompt'
);
--> statement-breakpoint
CREATE TABLE "change_package_approval" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_package_id" uuid NOT NULL,
	"role" text NOT NULL,
	"approver_id" text NOT NULL,
	"approver_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	"comments" text,
	"signature_hash" text
);
--> statement-breakpoint
CREATE TABLE "change_package_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_package_id" uuid NOT NULL,
	"field_path" text NOT NULL,
	"field_label" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"change_type" text NOT NULL,
	"impact_level" text,
	"requires_propagation" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_package_propagation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_package_id" uuid NOT NULL,
	"target_entity_type" text NOT NULL,
	"target_entity_id" uuid NOT NULL,
	"target_row_id" uuid,
	"decision" text NOT NULL,
	"decided_by" text,
	"decided_at" timestamp,
	"reason" text,
	"applied_at" timestamp,
	"applied_by" text
);
--> statement-breakpoint
CREATE TABLE "control_pairings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"failure_mode_id" uuid NOT NULL,
	"prevention_control_id" uuid,
	"detection_control_id" uuid,
	"effectiveness" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "control_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"part_id" uuid NOT NULL,
	"rev" text NOT NULL,
	"type" text NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"control_plan_number" text,
	"doc_no" text,
	"key_contact" text,
	"phone" text,
	"core_team" jsonb DEFAULT '[]'::jsonb,
	"orig_date" timestamp,
	"revision_date" timestamp,
	"prepared_by" text,
	"customer_approval_date" timestamp,
	"other_approval_date" timestamp,
	"primary_equipment" text,
	"mold_cells" text,
	"approved_by" uuid,
	"approved_at" timestamp,
	"effective_from" timestamp,
	"supersedes_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_auto_review_id" uuid,
	"last_auto_review_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "control_plan_row" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"control_plan_id" uuid NOT NULL,
	"source_pfmea_row_id" uuid,
	"parent_control_template_row_id" uuid,
	"row_seq" integer,
	"process_no" text,
	"process_name" text,
	"machine_device" text,
	"char_id" text NOT NULL,
	"characteristic_name" text NOT NULL,
	"type" text NOT NULL,
	"class_column" text,
	"specification" text,
	"target" text,
	"tolerance" text,
	"special_flag" boolean DEFAULT false,
	"csr_symbol" text,
	"measurement_system" text,
	"gage_details" text,
	"sample_size" text,
	"frequency" text,
	"control_method" text,
	"acceptance_criteria" text,
	"reaction_plan" text,
	"responsibility" text,
	"override_flags" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "control_template_row" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_def_id" uuid NOT NULL,
	"source_template_row_id" uuid,
	"characteristic_name" text NOT NULL,
	"char_id" text NOT NULL,
	"type" text NOT NULL,
	"class_column" text,
	"specification" text,
	"target" text,
	"tolerance" text,
	"special_flag" boolean DEFAULT false NOT NULL,
	"csr_symbol" text,
	"measurement_system" text,
	"gage_details" text,
	"default_sample_size" text,
	"default_frequency" text,
	"control_method" text,
	"acceptance_criteria" text,
	"reaction_plan" text,
	"default_responsibility" text
);
--> statement-breakpoint
CREATE TABLE "controls_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"type" "control_type" NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"effectiveness" "control_effectiveness" NOT NULL,
	"typical_occurrence_impact" integer,
	"typical_detection_rating" integer,
	"equipment_required" jsonb DEFAULT '[]'::jsonb,
	"skill_level_required" text,
	"implementation_notes" text,
	"requires_msa" boolean DEFAULT false,
	"msa_status" "msa_status" DEFAULT 'not_required',
	"gage_type" text,
	"gage_details" text,
	"measurement_resolution" text,
	"default_sample_size" text,
	"default_frequency" text,
	"control_method" text,
	"default_acceptance_criteria" text,
	"default_reaction_plan" text,
	"applicable_processes" jsonb DEFAULT '[]'::jsonb,
	"applicable_failure_modes" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"industry_standard" text,
	"last_used" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"control_category" text,
	"detection_min" integer,
	"detection_max" integer,
	"detection_rationale" text
);
--> statement-breakpoint
CREATE TABLE "distribution_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"recipients" text DEFAULT '[]' NOT NULL,
	"require_acknowledgment" integer DEFAULT 1,
	"acknowledgment_due_days" integer DEFAULT 7,
	"send_email_notification" integer DEFAULT 1,
	"status" text DEFAULT 'active',
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_number" text NOT NULL,
	"title" text NOT NULL,
	"type" "document_type" NOT NULL,
	"category" text,
	"department" text,
	"current_rev" text DEFAULT 'A' NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"owner" text NOT NULL,
	"effective_date" timestamp,
	"review_due_date" timestamp,
	"review_cycle_days" integer DEFAULT 365,
	"retention_years" integer DEFAULT 7,
	"description" text,
	"external_ref" text,
	"is_external" boolean DEFAULT false,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_doc_number_unique" UNIQUE("doc_number")
);
--> statement-breakpoint
CREATE TABLE "document_access_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"revision_id" uuid,
	"file_id" integer,
	"user_id" text NOT NULL,
	"user_name" text,
	"user_role" text,
	"user_department" text,
	"action" text NOT NULL,
	"action_details" text,
	"ip_address" text,
	"user_agent" text,
	"session_id" text,
	"timestamp" timestamp DEFAULT now(),
	"duration_ms" integer,
	"log_hash" text
);
--> statement-breakpoint
CREATE TABLE "document_checkout" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"checked_out_by" text NOT NULL,
	"checked_out_at" timestamp DEFAULT now(),
	"expected_checkin" timestamp,
	"purpose" text,
	"status" text DEFAULT 'active',
	"checked_in_at" timestamp,
	"checked_in_by" text,
	"force_released_by" text,
	"force_released_at" timestamp,
	"force_release_reason" text
);
--> statement-breakpoint
CREATE TABLE "document_comment" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"revision_id" uuid,
	"page_number" integer,
	"position_x" real,
	"position_y" real,
	"highlighted_text" text,
	"comment_type" text DEFAULT 'general',
	"content" text NOT NULL,
	"parent_comment_id" integer,
	"thread_resolved" integer DEFAULT 0,
	"resolved_by" text,
	"resolved_at" timestamp,
	"mentions" text DEFAULT '[]',
	"workflow_step_id" integer,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "document_distribution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"recipient_name" text NOT NULL,
	"recipient_role" text,
	"distributed_at" timestamp DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp,
	"method" text DEFAULT 'electronic',
	"copy_number" integer
);
--> statement-breakpoint
CREATE TABLE "document_distribution_record" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"distribution_list_id" integer,
	"recipient_user_id" text,
	"recipient_name" text NOT NULL,
	"recipient_email" text,
	"recipient_role" text,
	"recipient_department" text,
	"distributed_at" timestamp DEFAULT now(),
	"distributed_by" text NOT NULL,
	"distribution_method" text DEFAULT 'electronic',
	"copy_number" integer,
	"watermark_applied" integer DEFAULT 1,
	"watermark_text" text,
	"watermarked_file_id" integer,
	"requires_acknowledgment" integer DEFAULT 1,
	"acknowledgment_due_date" timestamp,
	"acknowledged_at" timestamp,
	"acknowledgment_method" text,
	"acknowledgment_ip" text,
	"acknowledgment_comment" text,
	"recalled_at" timestamp,
	"recalled_by" text,
	"recall_reason" text,
	"recall_acknowledged_at" timestamp,
	"status" text DEFAULT 'distributed'
);
--> statement-breakpoint
CREATE TABLE "document_file" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"document_id" uuid,
	"revision_id" uuid,
	"file_name" text NOT NULL,
	"original_name" text NOT NULL,
	"file_type" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"storage_provider" text DEFAULT 'local',
	"storage_path" text NOT NULL,
	"storage_bucket" text,
	"checksum_sha256" text NOT NULL,
	"checksum_verified_at" timestamp,
	"virus_scan_status" text DEFAULT 'pending',
	"virus_scan_at" timestamp,
	"thumbnail_path" text,
	"preview_generated" integer DEFAULT 0,
	"text_extracted" integer DEFAULT 0,
	"extracted_text" text,
	"page_count" integer,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_doc_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"link_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_link_enhanced" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"source_document_id" uuid NOT NULL,
	"source_revision_id" uuid,
	"target_type" text NOT NULL,
	"target_id" integer NOT NULL,
	"target_revision" text,
	"target_title" text,
	"link_type" text NOT NULL,
	"link_description" text,
	"bidirectional" integer DEFAULT 0,
	"reverse_link_id" integer,
	"link_verified_at" timestamp,
	"link_verified_by" text,
	"link_broken" integer DEFAULT 0,
	"link_broken_reason" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_print_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"file_id" integer NOT NULL,
	"printed_by" text NOT NULL,
	"printed_at" timestamp DEFAULT now(),
	"print_copies" integer DEFAULT 1,
	"print_purpose" text,
	"watermark_applied" integer DEFAULT 1,
	"watermark_text" text,
	"copy_numbers" text,
	"printer_name" text,
	"ip_address" text,
	"controlled_copies" text DEFAULT '[]',
	"copies_recalled" integer DEFAULT 0,
	"all_recalled" integer DEFAULT 0,
	"recall_verified_at" timestamp,
	"recall_verified_by" text
);
--> statement-breakpoint
CREATE TABLE "document_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"revision_id" uuid,
	"reviewer_name" text NOT NULL,
	"reviewer_role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"comments" text,
	"reviewed_at" timestamp,
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"rev" text NOT NULL,
	"change_description" text NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"author" text NOT NULL,
	"reviewed_by" text,
	"approved_by" text,
	"approved_at" timestamp,
	"effective_date" timestamp,
	"superseded_date" timestamp,
	"content_hash" text,
	"attachment_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"doc_type" text NOT NULL,
	"category" text,
	"department" text,
	"template_file_id" integer,
	"field_mappings" text DEFAULT '[]',
	"locked_zones" text DEFAULT '[]',
	"version" text DEFAULT '1',
	"status" text DEFAULT 'draft',
	"effective_from" timestamp,
	"default_workflow_id" integer,
	"default_review_cycle_days" integer DEFAULT 365,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipment_control_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"characteristic_type" text NOT NULL,
	"characteristic_name" text NOT NULL,
	"control_method" text NOT NULL,
	"measurement_system" text,
	"sample_size" text,
	"frequency" text,
	"acceptance_criteria" text,
	"reaction_plan" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_error_proofing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"control_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"failure_modes_addressed" jsonb DEFAULT '[]'::jsonb,
	"suggested_detection_rating" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"manufacturer" text,
	"model" text,
	"tonnage" integer,
	"serial_number" text,
	"location" text,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_document" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"doc_number" text NOT NULL,
	"title" text NOT NULL,
	"source" text NOT NULL,
	"external_url" text,
	"issuing_body" text,
	"current_version" text,
	"version_date" timestamp,
	"previous_version" text,
	"local_file_id" integer,
	"subscription_active" integer DEFAULT 0,
	"subscription_contact" text,
	"last_checked_at" timestamp,
	"update_available" integer DEFAULT 0,
	"update_notes" text,
	"affected_internal_docs" text DEFAULT '[]',
	"category" text,
	"applicability" text,
	"status" text DEFAULT 'active',
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "failure_modes_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"category" "failure_mode_category" NOT NULL,
	"failure_mode" text NOT NULL,
	"generic_effect" text NOT NULL,
	"typical_causes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"industry_standard" text,
	"applicable_processes" jsonb DEFAULT '[]'::jsonb,
	"default_severity" integer,
	"default_occurrence" integer,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"last_used" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"effect_category" text,
	"severity_min" integer,
	"severity_max" integer,
	"severity_rationale" text
);
--> statement-breakpoint
CREATE TABLE "fmea_template_catalog_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_row_id" uuid NOT NULL,
	"catalog_item_id" uuid NOT NULL,
	"customized" boolean DEFAULT false NOT NULL,
	"adopted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmea_template_row" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_def_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"function" text NOT NULL,
	"requirement" text NOT NULL,
	"failure_mode" text NOT NULL,
	"effect" text NOT NULL,
	"severity" integer NOT NULL,
	"cause" text NOT NULL,
	"occurrence" integer NOT NULL,
	"prevention_controls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"detection_controls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"detection" integer NOT NULL,
	"ap" text NOT NULL,
	"special_flag" boolean DEFAULT false NOT NULL,
	"csr_symbol" text,
	"class_column" text,
	"notes" text,
	"default_responsibility" text,
	"effect_category" text,
	"severity_justification" text,
	"occurrence_method" text,
	"cpk_value" text,
	"occurrence_justification" text,
	"detection_control_id" uuid,
	"detection_justification" text
);
--> statement-breakpoint
CREATE TABLE "gage_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"model" text,
	"resolution" text,
	"calibration_interval_days" integer,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"priority" text DEFAULT 'normal' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ownership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"owner_user_id" text NOT NULL,
	"watchers" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "part" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer" text NOT NULL,
	"program" text NOT NULL,
	"part_number" text NOT NULL,
	"part_name" text NOT NULL,
	"part_rev_level" text,
	"plant" text NOT NULL,
	"mold" text,
	"mold_description" text,
	"primary_equipment" text,
	"csr_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "part_process_map" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"part_id" uuid NOT NULL,
	"process_def_id" uuid NOT NULL,
	"process_rev" text NOT NULL,
	"sequence" integer NOT NULL,
	"assumptions" text
);
--> statement-breakpoint
CREATE TABLE "pfd" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"part_id" uuid NOT NULL,
	"rev" text NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"pfd_number" text,
	"doc_no" text,
	"prepared_by" text,
	"approved_by" text,
	"revision_type" text,
	"revision_date" timestamp,
	"primary_equipment" text,
	"mold_cells" text,
	"cell_layout_notes" text,
	"mermaid_diagram" text,
	"diagram_json" jsonb,
	"orig_date" timestamp,
	"approved_at" timestamp,
	"effective_from" timestamp,
	"supersedes_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pfd_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pfd_id" uuid NOT NULL,
	"source_step_id" uuid,
	"seq" integer NOT NULL,
	"process_no" text,
	"name" text NOT NULL,
	"area" text,
	"symbol" text,
	"key_inputs" text,
	"key_outputs" text,
	"control_method" text,
	"equipment" jsonb,
	"override_flags" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "pfmea" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"part_id" uuid NOT NULL,
	"rev" text NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"basis" text,
	"pfmea_number" text,
	"doc_no" text,
	"key_contact" text,
	"prepared_by" text,
	"pfmea_team" jsonb DEFAULT '[]'::jsonb,
	"orig_date" timestamp,
	"revision_date" timestamp,
	"approved_by" uuid,
	"approved_at" timestamp,
	"effective_from" timestamp,
	"supersedes_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_auto_review_id" uuid,
	"last_auto_review_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pfmea_row" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pfmea_id" uuid NOT NULL,
	"parent_template_row_id" uuid,
	"row_seq" integer,
	"process_no" text,
	"process_step" text,
	"step_ref" text NOT NULL,
	"function" text NOT NULL,
	"requirement" text NOT NULL,
	"failure_mode" text NOT NULL,
	"effect" text NOT NULL,
	"severity" integer NOT NULL,
	"class_column" text,
	"cause" text NOT NULL,
	"occurrence" integer NOT NULL,
	"prevention_controls" jsonb DEFAULT '[]'::jsonb,
	"detection_controls" jsonb DEFAULT '[]'::jsonb,
	"detection" integer NOT NULL,
	"ap" text NOT NULL,
	"special_flag" boolean DEFAULT false,
	"csr_symbol" text,
	"override_flags" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"recommended_action" text,
	"responsibility" text,
	"target_date" timestamp,
	"actions_taken" text,
	"completion_date" timestamp,
	"new_severity" integer,
	"new_occurrence" integer,
	"new_detection" integer,
	"new_ap" text,
	"action_status" text DEFAULT 'none',
	"effect_category" text,
	"severity_justification" text,
	"occurrence_method" text,
	"cpk_value" text,
	"occurrence_justification" text,
	"detection_control_id" uuid,
	"detection_justification" text
);
--> statement-breakpoint
CREATE TABLE "process_def" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"rev" text NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"effective_from" timestamp,
	"supersedes_id" uuid,
	"change_note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_def_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"name" text NOT NULL,
	"area" text NOT NULL,
	"equipment" jsonb,
	"equipment_ids" jsonb DEFAULT '[]'::jsonb,
	"branch_to" text,
	"rework_to" text,
	"symbol" text,
	"key_inputs" text,
	"key_outputs" text,
	"control_method" text,
	"step_type" "step_type" DEFAULT 'operation' NOT NULL,
	"parent_step_id" uuid,
	"subprocess_ref_id" uuid,
	"subprocess_rev" text,
	"collapsed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "rating_scale" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"version" text NOT NULL,
	"kind" text NOT NULL,
	"table_json" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "signature" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"role" text NOT NULL,
	"signer_user_id" text NOT NULL,
	"signer_name" text NOT NULL,
	"signer_email" text,
	"signed_at" timestamp DEFAULT now() NOT NULL,
	"content_hash" text NOT NULL,
	"signature_data" text,
	"meaning" text,
	"comment" text,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_item" ADD CONSTRAINT "action_item_pfmea_row_id_pfmea_row_id_fk" FOREIGN KEY ("pfmea_row_id") REFERENCES "public"."pfmea_row"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_definition" ADD CONSTRAINT "approval_workflow_definition_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_instance" ADD CONSTRAINT "approval_workflow_instance_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_instance" ADD CONSTRAINT "approval_workflow_instance_workflow_definition_id_approval_workflow_definition_id_fk" FOREIGN KEY ("workflow_definition_id") REFERENCES "public"."approval_workflow_definition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_instance" ADD CONSTRAINT "approval_workflow_instance_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_instance" ADD CONSTRAINT "approval_workflow_instance_revision_id_document_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."document_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_step" ADD CONSTRAINT "approval_workflow_step_workflow_instance_id_approval_workflow_instance_id_fk" FOREIGN KEY ("workflow_instance_id") REFERENCES "public"."approval_workflow_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_review_finding" ADD CONSTRAINT "auto_review_finding_review_run_id_auto_review_run_id_fk" FOREIGN KEY ("review_run_id") REFERENCES "public"."auto_review_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_review_run" ADD CONSTRAINT "auto_review_run_pfmea_id_pfmea_id_fk" FOREIGN KEY ("pfmea_id") REFERENCES "public"."pfmea"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_review_run" ADD CONSTRAINT "auto_review_run_control_plan_id_control_plan_id_fk" FOREIGN KEY ("control_plan_id") REFERENCES "public"."control_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calibration_link" ADD CONSTRAINT "calibration_link_gage_id_gage_library_id_fk" FOREIGN KEY ("gage_id") REFERENCES "public"."gage_library"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa" ADD CONSTRAINT "capa_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_analysis_tool" ADD CONSTRAINT "capa_analysis_tool_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_analysis_tool" ADD CONSTRAINT "capa_analysis_tool_capa_id_capa_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."capa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_attachment" ADD CONSTRAINT "capa_attachment_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_attachment" ADD CONSTRAINT "capa_attachment_capa_id_capa_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."capa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_audit_log" ADD CONSTRAINT "capa_audit_log_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d0_emergency" ADD CONSTRAINT "capa_d0_emergency_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d0_emergency" ADD CONSTRAINT "capa_d0_emergency_capa_id_capa_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."capa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d1_team_detail" ADD CONSTRAINT "capa_d1_team_detail_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d1_team_detail" ADD CONSTRAINT "capa_d1_team_detail_capa_id_capa_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."capa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d2_problem" ADD CONSTRAINT "capa_d2_problem_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d2_problem" ADD CONSTRAINT "capa_d2_problem_capa_id_capa_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."capa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d3_containment" ADD CONSTRAINT "capa_d3_containment_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d3_containment" ADD CONSTRAINT "capa_d3_containment_capa_id_capa_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."capa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d4_root_cause" ADD CONSTRAINT "capa_d4_root_cause_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d4_root_cause" ADD CONSTRAINT "capa_d4_root_cause_capa_id_capa_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."capa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d4_root_cause_candidate" ADD CONSTRAINT "capa_d4_root_cause_candidate_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d4_root_cause_candidate" ADD CONSTRAINT "capa_d4_root_cause_candidate_capa_id_capa_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."capa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d4_root_cause_candidate" ADD CONSTRAINT "capa_d4_root_cause_candidate_d4_id_capa_d4_root_cause_id_fk" FOREIGN KEY ("d4_id") REFERENCES "public"."capa_d4_root_cause"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d5_corrective_action" ADD CONSTRAINT "capa_d5_corrective_action_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d5_corrective_action" ADD CONSTRAINT "capa_d5_corrective_action_capa_id_capa_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."capa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d6_validation" ADD CONSTRAINT "capa_d6_validation_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d6_validation" ADD CONSTRAINT "capa_d6_validation_capa_id_capa_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."capa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d7_preventive" ADD CONSTRAINT "capa_d7_preventive_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d7_preventive" ADD CONSTRAINT "capa_d7_preventive_capa_id_capa_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."capa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d8_closure" ADD CONSTRAINT "capa_d8_closure_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_d8_closure" ADD CONSTRAINT "capa_d8_closure_capa_id_capa_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."capa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_metric_snapshot" ADD CONSTRAINT "capa_metric_snapshot_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_number_sequence" ADD CONSTRAINT "capa_number_sequence_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_related_record" ADD CONSTRAINT "capa_related_record_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_related_record" ADD CONSTRAINT "capa_related_record_capa_id_capa_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."capa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_source" ADD CONSTRAINT "capa_source_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_source" ADD CONSTRAINT "capa_source_capa_id_capa_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."capa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_team_member" ADD CONSTRAINT "capa_team_member_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capa_team_member" ADD CONSTRAINT "capa_team_member_capa_id_capa_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."capa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_package" ADD CONSTRAINT "change_package_auto_review_id_auto_review_run_id_fk" FOREIGN KEY ("auto_review_id") REFERENCES "public"."auto_review_run"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_package_approval" ADD CONSTRAINT "change_package_approval_change_package_id_change_package_id_fk" FOREIGN KEY ("change_package_id") REFERENCES "public"."change_package"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_package_item" ADD CONSTRAINT "change_package_item_change_package_id_change_package_id_fk" FOREIGN KEY ("change_package_id") REFERENCES "public"."change_package"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_package_propagation" ADD CONSTRAINT "change_package_propagation_change_package_id_change_package_id_fk" FOREIGN KEY ("change_package_id") REFERENCES "public"."change_package"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_pairings" ADD CONSTRAINT "control_pairings_failure_mode_id_failure_modes_library_id_fk" FOREIGN KEY ("failure_mode_id") REFERENCES "public"."failure_modes_library"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_pairings" ADD CONSTRAINT "control_pairings_prevention_control_id_controls_library_id_fk" FOREIGN KEY ("prevention_control_id") REFERENCES "public"."controls_library"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_pairings" ADD CONSTRAINT "control_pairings_detection_control_id_controls_library_id_fk" FOREIGN KEY ("detection_control_id") REFERENCES "public"."controls_library"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_plan" ADD CONSTRAINT "control_plan_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_plan" ADD CONSTRAINT "control_plan_part_id_part_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."part"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_plan" ADD CONSTRAINT "control_plan_supersedes_id_control_plan_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."control_plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_plan_row" ADD CONSTRAINT "control_plan_row_control_plan_id_control_plan_id_fk" FOREIGN KEY ("control_plan_id") REFERENCES "public"."control_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_plan_row" ADD CONSTRAINT "control_plan_row_source_pfmea_row_id_pfmea_row_id_fk" FOREIGN KEY ("source_pfmea_row_id") REFERENCES "public"."pfmea_row"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_plan_row" ADD CONSTRAINT "control_plan_row_parent_control_template_row_id_control_template_row_id_fk" FOREIGN KEY ("parent_control_template_row_id") REFERENCES "public"."control_template_row"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_template_row" ADD CONSTRAINT "control_template_row_process_def_id_process_def_id_fk" FOREIGN KEY ("process_def_id") REFERENCES "public"."process_def"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_template_row" ADD CONSTRAINT "control_template_row_source_template_row_id_fmea_template_row_id_fk" FOREIGN KEY ("source_template_row_id") REFERENCES "public"."fmea_template_row"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "controls_library" ADD CONSTRAINT "controls_library_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_list" ADD CONSTRAINT "distribution_list_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_log" ADD CONSTRAINT "document_access_log_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_log" ADD CONSTRAINT "document_access_log_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_log" ADD CONSTRAINT "document_access_log_revision_id_document_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."document_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_log" ADD CONSTRAINT "document_access_log_file_id_document_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."document_file"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_checkout" ADD CONSTRAINT "document_checkout_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_checkout" ADD CONSTRAINT "document_checkout_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comment" ADD CONSTRAINT "document_comment_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comment" ADD CONSTRAINT "document_comment_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comment" ADD CONSTRAINT "document_comment_revision_id_document_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."document_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comment" ADD CONSTRAINT "document_comment_parent_comment_id_document_comment_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."document_comment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comment" ADD CONSTRAINT "document_comment_workflow_step_id_approval_workflow_step_id_fk" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."approval_workflow_step"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_distribution" ADD CONSTRAINT "document_distribution_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_distribution" ADD CONSTRAINT "document_distribution_revision_id_document_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."document_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_distribution_record" ADD CONSTRAINT "document_distribution_record_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_distribution_record" ADD CONSTRAINT "document_distribution_record_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_distribution_record" ADD CONSTRAINT "document_distribution_record_revision_id_document_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."document_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_distribution_record" ADD CONSTRAINT "document_distribution_record_distribution_list_id_distribution_list_id_fk" FOREIGN KEY ("distribution_list_id") REFERENCES "public"."distribution_list"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_distribution_record" ADD CONSTRAINT "document_distribution_record_watermarked_file_id_document_file_id_fk" FOREIGN KEY ("watermarked_file_id") REFERENCES "public"."document_file"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_file" ADD CONSTRAINT "document_file_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_file" ADD CONSTRAINT "document_file_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_file" ADD CONSTRAINT "document_file_revision_id_document_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."document_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_link" ADD CONSTRAINT "document_link_source_doc_id_document_id_fk" FOREIGN KEY ("source_doc_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_link_enhanced" ADD CONSTRAINT "document_link_enhanced_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_link_enhanced" ADD CONSTRAINT "document_link_enhanced_source_document_id_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_link_enhanced" ADD CONSTRAINT "document_link_enhanced_source_revision_id_document_revision_id_fk" FOREIGN KEY ("source_revision_id") REFERENCES "public"."document_revision"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_link_enhanced" ADD CONSTRAINT "document_link_enhanced_reverse_link_id_document_link_enhanced_id_fk" FOREIGN KEY ("reverse_link_id") REFERENCES "public"."document_link_enhanced"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_print_log" ADD CONSTRAINT "document_print_log_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_print_log" ADD CONSTRAINT "document_print_log_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_print_log" ADD CONSTRAINT "document_print_log_revision_id_document_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."document_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_print_log" ADD CONSTRAINT "document_print_log_file_id_document_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."document_file"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review" ADD CONSTRAINT "document_review_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review" ADD CONSTRAINT "document_review_revision_id_document_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."document_revision"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_revision" ADD CONSTRAINT "document_revision_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_template" ADD CONSTRAINT "document_template_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_template" ADD CONSTRAINT "document_template_template_file_id_document_file_id_fk" FOREIGN KEY ("template_file_id") REFERENCES "public"."document_file"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_template" ADD CONSTRAINT "document_template_default_workflow_id_approval_workflow_definition_id_fk" FOREIGN KEY ("default_workflow_id") REFERENCES "public"."approval_workflow_definition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_control_methods" ADD CONSTRAINT "equipment_control_methods_equipment_id_equipment_library_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment_library"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_error_proofing" ADD CONSTRAINT "equipment_error_proofing_equipment_id_equipment_library_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment_library"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_library" ADD CONSTRAINT "equipment_library_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_document" ADD CONSTRAINT "external_document_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_document" ADD CONSTRAINT "external_document_local_file_id_document_file_id_fk" FOREIGN KEY ("local_file_id") REFERENCES "public"."document_file"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failure_modes_library" ADD CONSTRAINT "failure_modes_library_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_template_catalog_link" ADD CONSTRAINT "fmea_template_catalog_link_template_row_id_fmea_template_row_id_fk" FOREIGN KEY ("template_row_id") REFERENCES "public"."fmea_template_row"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_template_catalog_link" ADD CONSTRAINT "fmea_template_catalog_link_catalog_item_id_failure_modes_library_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."failure_modes_library"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_template_row" ADD CONSTRAINT "fmea_template_row_process_def_id_process_def_id_fk" FOREIGN KEY ("process_def_id") REFERENCES "public"."process_def"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_template_row" ADD CONSTRAINT "fmea_template_row_step_id_process_step_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."process_step"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gage_library" ADD CONSTRAINT "gage_library_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part" ADD CONSTRAINT "part_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_process_map" ADD CONSTRAINT "part_process_map_part_id_part_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."part"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_process_map" ADD CONSTRAINT "part_process_map_process_def_id_process_def_id_fk" FOREIGN KEY ("process_def_id") REFERENCES "public"."process_def"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pfd" ADD CONSTRAINT "pfd_part_id_part_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."part"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pfd" ADD CONSTRAINT "pfd_supersedes_id_pfd_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."pfd"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pfd_step" ADD CONSTRAINT "pfd_step_pfd_id_pfd_id_fk" FOREIGN KEY ("pfd_id") REFERENCES "public"."pfd"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pfd_step" ADD CONSTRAINT "pfd_step_source_step_id_process_step_id_fk" FOREIGN KEY ("source_step_id") REFERENCES "public"."process_step"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pfmea" ADD CONSTRAINT "pfmea_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pfmea" ADD CONSTRAINT "pfmea_part_id_part_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."part"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pfmea" ADD CONSTRAINT "pfmea_supersedes_id_pfmea_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."pfmea"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pfmea_row" ADD CONSTRAINT "pfmea_row_pfmea_id_pfmea_id_fk" FOREIGN KEY ("pfmea_id") REFERENCES "public"."pfmea"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pfmea_row" ADD CONSTRAINT "pfmea_row_parent_template_row_id_fmea_template_row_id_fk" FOREIGN KEY ("parent_template_row_id") REFERENCES "public"."fmea_template_row"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_def" ADD CONSTRAINT "process_def_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_def" ADD CONSTRAINT "process_def_supersedes_id_process_def_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."process_def"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_step" ADD CONSTRAINT "process_step_process_def_id_process_def_id_fk" FOREIGN KEY ("process_def_id") REFERENCES "public"."process_def"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_step" ADD CONSTRAINT "process_step_parent_step_id_process_step_id_fk" FOREIGN KEY ("parent_step_id") REFERENCES "public"."process_step"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_step" ADD CONSTRAINT "process_step_subprocess_ref_id_process_def_id_fk" FOREIGN KEY ("subprocess_ref_id") REFERENCES "public"."process_def"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_scale" ADD CONSTRAINT "rating_scale_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_item_pfmea_row_idx" ON "action_item" USING btree ("pfmea_row_id");--> statement-breakpoint
CREATE INDEX "action_item_status_idx" ON "action_item" USING btree ("status");--> statement-breakpoint
CREATE INDEX "action_item_target_date_idx" ON "action_item" USING btree ("target_date");--> statement-breakpoint
CREATE INDEX "approval_workflow_def_org_idx" ON "approval_workflow_definition" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "approval_workflow_def_org_code_idx" ON "approval_workflow_definition" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "approval_workflow_inst_org_idx" ON "approval_workflow_instance" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "approval_workflow_inst_doc_idx" ON "approval_workflow_instance" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "approval_workflow_inst_status_idx" ON "approval_workflow_instance" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approval_workflow_step_instance_idx" ON "approval_workflow_step" USING btree ("workflow_instance_id");--> statement-breakpoint
CREATE INDEX "approval_workflow_step_assigned_idx" ON "approval_workflow_step" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "approval_workflow_step_status_idx" ON "approval_workflow_step" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "auto_review_finding_run_idx" ON "auto_review_finding" USING btree ("review_run_id");--> statement-breakpoint
CREATE INDEX "auto_review_finding_level_idx" ON "auto_review_finding" USING btree ("level");--> statement-breakpoint
CREATE INDEX "auto_review_finding_category_idx" ON "auto_review_finding" USING btree ("category");--> statement-breakpoint
CREATE INDEX "auto_review_finding_entity_idx" ON "auto_review_finding" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "auto_review_run_pfmea_idx" ON "auto_review_run" USING btree ("pfmea_id");--> statement-breakpoint
CREATE INDEX "auto_review_run_cp_idx" ON "auto_review_run" USING btree ("control_plan_id");--> statement-breakpoint
CREATE INDEX "auto_review_run_at_idx" ON "auto_review_run" USING btree ("run_at");--> statement-breakpoint
CREATE INDEX "calibration_link_gage_idx" ON "calibration_link" USING btree ("gage_id");--> statement-breakpoint
CREATE INDEX "capa_org_idx" ON "capa" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "capa_org_number_idx" ON "capa" USING btree ("org_id","capa_number");--> statement-breakpoint
CREATE INDEX "capa_status_idx" ON "capa" USING btree ("status");--> statement-breakpoint
CREATE INDEX "capa_priority_idx" ON "capa" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "capa_main_source_type_idx" ON "capa" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "capa_created_at_idx" ON "capa" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "capa_analysis_tool_capa_idx" ON "capa_analysis_tool" USING btree ("capa_id");--> statement-breakpoint
CREATE INDEX "capa_analysis_tool_type_idx" ON "capa_analysis_tool" USING btree ("capa_id","tool_type");--> statement-breakpoint
CREATE INDEX "capa_analysis_tool_org_idx" ON "capa_analysis_tool" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "capa_attachment_capa_idx" ON "capa_attachment" USING btree ("capa_id");--> statement-breakpoint
CREATE INDEX "capa_attachment_discipline_idx" ON "capa_attachment" USING btree ("discipline");--> statement-breakpoint
CREATE INDEX "capa_attachment_type_idx" ON "capa_attachment" USING btree ("attachment_type");--> statement-breakpoint
CREATE INDEX "capa_attachment_evidence_idx" ON "capa_attachment" USING btree ("is_evidence");--> statement-breakpoint
CREATE INDEX "capa_audit_log_capa_idx" ON "capa_audit_log" USING btree ("capa_id");--> statement-breakpoint
CREATE INDEX "capa_audit_log_action_idx" ON "capa_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "capa_audit_log_user_idx" ON "capa_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "capa_audit_log_timestamp_idx" ON "capa_audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "capa_audit_log_discipline_idx" ON "capa_audit_log" USING btree ("discipline");--> statement-breakpoint
CREATE UNIQUE INDEX "capa_d0_emergency_capa_idx" ON "capa_d0_emergency" USING btree ("capa_id");--> statement-breakpoint
CREATE INDEX "capa_d0_emergency_threat_idx" ON "capa_d0_emergency" USING btree ("threat_level");--> statement-breakpoint
CREATE INDEX "capa_d0_emergency_safety_idx" ON "capa_d0_emergency" USING btree ("safety_impact");--> statement-breakpoint
CREATE UNIQUE INDEX "capa_d1_team_detail_capa_idx" ON "capa_d1_team_detail" USING btree ("capa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "capa_d2_problem_capa_idx" ON "capa_d2_problem" USING btree ("capa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "capa_d3_containment_capa_idx" ON "capa_d3_containment" USING btree ("capa_id");--> statement-breakpoint
CREATE INDEX "capa_d3_containment_effective_idx" ON "capa_d3_containment" USING btree ("containment_effective");--> statement-breakpoint
CREATE UNIQUE INDEX "capa_d4_root_cause_capa_idx" ON "capa_d4_root_cause" USING btree ("capa_id");--> statement-breakpoint
CREATE INDEX "capa_d4_root_cause_confidence_idx" ON "capa_d4_root_cause" USING btree ("confidence_level");--> statement-breakpoint
CREATE INDEX "capa_d4_candidate_capa_idx" ON "capa_d4_root_cause_candidate" USING btree ("capa_id");--> statement-breakpoint
CREATE INDEX "capa_d4_candidate_d4_idx" ON "capa_d4_root_cause_candidate" USING btree ("d4_id");--> statement-breakpoint
CREATE INDEX "capa_d4_candidate_root_cause_idx" ON "capa_d4_root_cause_candidate" USING btree ("is_root_cause");--> statement-breakpoint
CREATE INDEX "capa_d4_candidate_verification_idx" ON "capa_d4_root_cause_candidate" USING btree ("verification_result");--> statement-breakpoint
CREATE UNIQUE INDEX "capa_d5_corrective_action_capa_idx" ON "capa_d5_corrective_action" USING btree ("capa_id");--> statement-breakpoint
CREATE INDEX "capa_d5_corrective_action_approval_idx" ON "capa_d5_corrective_action" USING btree ("management_approval_status");--> statement-breakpoint
CREATE UNIQUE INDEX "capa_d6_validation_capa_idx" ON "capa_d6_validation" USING btree ("capa_id");--> statement-breakpoint
CREATE INDEX "capa_d6_validation_status_idx" ON "capa_d6_validation" USING btree ("implementation_status");--> statement-breakpoint
CREATE INDEX "capa_d6_validation_effectiveness_idx" ON "capa_d6_validation" USING btree ("effectiveness_result");--> statement-breakpoint
CREATE UNIQUE INDEX "capa_d7_preventive_capa_idx" ON "capa_d7_preventive" USING btree ("capa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "capa_d8_closure_capa_idx" ON "capa_d8_closure" USING btree ("capa_id");--> statement-breakpoint
CREATE INDEX "capa_metric_snapshot_org_date_idx" ON "capa_metric_snapshot" USING btree ("org_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "capa_metric_snapshot_period_idx" ON "capa_metric_snapshot" USING btree ("snapshot_period");--> statement-breakpoint
CREATE UNIQUE INDEX "capa_number_sequence_org_year_idx" ON "capa_number_sequence" USING btree ("org_id","year");--> statement-breakpoint
CREATE INDEX "capa_related_record_capa_idx" ON "capa_related_record" USING btree ("capa_id");--> statement-breakpoint
CREATE INDEX "capa_related_record_related_idx" ON "capa_related_record" USING btree ("related_type","related_id");--> statement-breakpoint
CREATE UNIQUE INDEX "capa_related_record_unique_idx" ON "capa_related_record" USING btree ("capa_id","related_type","related_id","relationship_type");--> statement-breakpoint
CREATE INDEX "capa_source_capa_idx" ON "capa_source" USING btree ("capa_id");--> statement-breakpoint
CREATE INDEX "capa_source_type_idx" ON "capa_source" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "capa_source_external_id_idx" ON "capa_source" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "capa_team_member_capa_idx" ON "capa_team_member" USING btree ("capa_id");--> statement-breakpoint
CREATE INDEX "capa_team_member_user_idx" ON "capa_team_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "capa_team_member_role_idx" ON "capa_team_member" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "capa_team_member_unique_idx" ON "capa_team_member" USING btree ("capa_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "change_package_number_idx" ON "change_package" USING btree ("package_number");--> statement-breakpoint
CREATE INDEX "change_package_status_idx" ON "change_package" USING btree ("status");--> statement-breakpoint
CREATE INDEX "change_package_target_idx" ON "change_package" USING btree ("target_entity_type","target_entity_id");--> statement-breakpoint
CREATE INDEX "change_package_initiated_at_idx" ON "change_package" USING btree ("initiated_at");--> statement-breakpoint
CREATE INDEX "change_package_approval_package_idx" ON "change_package_approval" USING btree ("change_package_id");--> statement-breakpoint
CREATE INDEX "change_package_approval_status_idx" ON "change_package_approval" USING btree ("status");--> statement-breakpoint
CREATE INDEX "change_package_item_package_idx" ON "change_package_item" USING btree ("change_package_id");--> statement-breakpoint
CREATE INDEX "change_propagation_package_idx" ON "change_package_propagation" USING btree ("change_package_id");--> statement-breakpoint
CREATE INDEX "change_propagation_target_idx" ON "change_package_propagation" USING btree ("target_entity_type","target_entity_id");--> statement-breakpoint
CREATE INDEX "control_pairings_fm_idx" ON "control_pairings" USING btree ("failure_mode_id");--> statement-breakpoint
CREATE INDEX "control_pairings_prevention_idx" ON "control_pairings" USING btree ("prevention_control_id");--> statement-breakpoint
CREATE INDEX "control_pairings_detection_idx" ON "control_pairings" USING btree ("detection_control_id");--> statement-breakpoint
CREATE UNIQUE INDEX "control_plan_part_rev_idx" ON "control_plan" USING btree ("part_id","rev");--> statement-breakpoint
CREATE INDEX "control_plan_number_idx" ON "control_plan" USING btree ("control_plan_number");--> statement-breakpoint
CREATE INDEX "control_plan_org_idx" ON "control_plan" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "control_plan_row_plan_idx" ON "control_plan_row" USING btree ("control_plan_id");--> statement-breakpoint
CREATE INDEX "control_plan_row_pfmea_idx" ON "control_plan_row" USING btree ("source_pfmea_row_id");--> statement-breakpoint
CREATE INDEX "control_plan_row_char_id_idx" ON "control_plan_row" USING btree ("char_id");--> statement-breakpoint
CREATE INDEX "control_plan_row_process_no_idx" ON "control_plan_row" USING btree ("process_no");--> statement-breakpoint
CREATE INDEX "control_template_process_def_idx" ON "control_template_row" USING btree ("process_def_id");--> statement-breakpoint
CREATE INDEX "control_template_source_row_idx" ON "control_template_row" USING btree ("source_template_row_id");--> statement-breakpoint
CREATE INDEX "control_template_char_id_idx" ON "control_template_row" USING btree ("char_id");--> statement-breakpoint
CREATE INDEX "controls_library_type_idx" ON "controls_library" USING btree ("type");--> statement-breakpoint
CREATE INDEX "controls_library_effectiveness_idx" ON "controls_library" USING btree ("effectiveness");--> statement-breakpoint
CREATE INDEX "controls_library_status_idx" ON "controls_library" USING btree ("status");--> statement-breakpoint
CREATE INDEX "controls_library_control_category_idx" ON "controls_library" USING btree ("control_category");--> statement-breakpoint
CREATE UNIQUE INDEX "controls_library_org_name_idx" ON "controls_library" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "controls_library_org_idx" ON "controls_library" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "distribution_list_org_idx" ON "distribution_list" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "distribution_list_org_code_idx" ON "distribution_list" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "document_status_idx" ON "document" USING btree ("status");--> statement-breakpoint
CREATE INDEX "document_type_idx" ON "document" USING btree ("type");--> statement-breakpoint
CREATE INDEX "document_doc_number_idx" ON "document" USING btree ("doc_number");--> statement-breakpoint
CREATE INDEX "document_access_log_org_idx" ON "document_access_log" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "document_checkout_org_idx" ON "document_checkout" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "document_checkout_document_idx" ON "document_checkout" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_checkout_status_idx" ON "document_checkout" USING btree ("status");--> statement-breakpoint
CREATE INDEX "document_comment_org_idx" ON "document_comment" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "doc_distribution_document_id_idx" ON "document_distribution" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_distribution_record_org_idx" ON "document_distribution_record" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "document_file_org_idx" ON "document_file" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "document_file_document_idx" ON "document_file" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_file_revision_idx" ON "document_file" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "doc_link_source_doc_id_idx" ON "document_link" USING btree ("source_doc_id");--> statement-breakpoint
CREATE INDEX "document_link_enhanced_org_idx" ON "document_link_enhanced" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "document_print_log_org_idx" ON "document_print_log" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "doc_review_document_id_idx" ON "document_review" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "doc_review_status_idx" ON "document_review" USING btree ("status");--> statement-breakpoint
CREATE INDEX "doc_revision_document_id_idx" ON "document_revision" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_template_org_idx" ON "document_template" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_template_org_code_idx" ON "document_template" USING btree ("org_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "equipment_library_org_name_idx" ON "equipment_library" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "equipment_library_org_idx" ON "equipment_library" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "external_document_org_idx" ON "external_document" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "external_document_org_doc_number_idx" ON "external_document" USING btree ("org_id","doc_number");--> statement-breakpoint
CREATE INDEX "failure_modes_category_idx" ON "failure_modes_library" USING btree ("category");--> statement-breakpoint
CREATE INDEX "failure_modes_status_idx" ON "failure_modes_library" USING btree ("status");--> statement-breakpoint
CREATE INDEX "failure_modes_effect_category_idx" ON "failure_modes_library" USING btree ("effect_category");--> statement-breakpoint
CREATE UNIQUE INDEX "failure_modes_org_name_idx" ON "failure_modes_library" USING btree ("org_id","failure_mode");--> statement-breakpoint
CREATE INDEX "failure_modes_org_idx" ON "failure_modes_library" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fmea_catalog_link_template_idx" ON "fmea_template_catalog_link" USING btree ("template_row_id");--> statement-breakpoint
CREATE INDEX "fmea_catalog_link_catalog_idx" ON "fmea_template_catalog_link" USING btree ("catalog_item_id");--> statement-breakpoint
CREATE INDEX "fmea_template_process_def_idx" ON "fmea_template_row" USING btree ("process_def_id");--> statement-breakpoint
CREATE INDEX "fmea_template_step_idx" ON "fmea_template_row" USING btree ("step_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gage_library_org_name_idx" ON "gage_library" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "gage_library_org_idx" ON "gage_library" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_idx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "ownership_entity_idx" ON "ownership" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "part_number_idx" ON "part" USING btree ("org_id","part_number");--> statement-breakpoint
CREATE INDEX "part_org_idx" ON "part" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "part_process_map_part_seq_idx" ON "part_process_map" USING btree ("part_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "pfd_part_rev_idx" ON "pfd" USING btree ("part_id","rev");--> statement-breakpoint
CREATE INDEX "pfd_number_idx" ON "pfd" USING btree ("pfd_number");--> statement-breakpoint
CREATE UNIQUE INDEX "pfd_step_pfd_seq_idx" ON "pfd_step" USING btree ("pfd_id","seq");--> statement-breakpoint
CREATE INDEX "pfd_step_source_idx" ON "pfd_step" USING btree ("source_step_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pfmea_part_rev_idx" ON "pfmea" USING btree ("part_id","rev");--> statement-breakpoint
CREATE INDEX "pfmea_number_idx" ON "pfmea" USING btree ("pfmea_number");--> statement-breakpoint
CREATE INDEX "pfmea_org_idx" ON "pfmea" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "pfmea_row_pfmea_idx" ON "pfmea_row" USING btree ("pfmea_id");--> statement-breakpoint
CREATE INDEX "pfmea_row_parent_template_idx" ON "pfmea_row" USING btree ("parent_template_row_id");--> statement-breakpoint
CREATE INDEX "pfmea_row_process_no_idx" ON "pfmea_row" USING btree ("process_no");--> statement-breakpoint
CREATE UNIQUE INDEX "process_def_name_rev_idx" ON "process_def" USING btree ("org_id","name","rev");--> statement-breakpoint
CREATE INDEX "process_def_status_idx" ON "process_def" USING btree ("status");--> statement-breakpoint
CREATE INDEX "process_def_org_idx" ON "process_def" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "process_step_def_seq_idx" ON "process_step" USING btree ("process_def_id","seq");--> statement-breakpoint
CREATE INDEX "process_step_parent_idx" ON "process_step" USING btree ("parent_step_id");--> statement-breakpoint
CREATE INDEX "process_step_subprocess_ref_idx" ON "process_step" USING btree ("subprocess_ref_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rating_scale_version_kind_idx" ON "rating_scale" USING btree ("org_id","version","kind");--> statement-breakpoint
CREATE INDEX "rating_scale_org_idx" ON "rating_scale" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "signature_entity_idx" ON "signature" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "signature_role_idx" ON "signature" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "user_org_email_idx" ON "user" USING btree ("org_id","email");--> statement-breakpoint
CREATE INDEX "user_org_idx" ON "user" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");