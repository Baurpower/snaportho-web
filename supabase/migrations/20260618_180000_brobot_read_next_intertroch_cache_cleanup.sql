-- ============================================================================
-- BroBot Read Next cache cleanup for intertrochanteric false positives
-- Removes cached AVN/pediatric/femoral-neck spillover results after stricter
-- topic verification was introduced.
-- ============================================================================

delete from public.brobot_reading_recommendation_cache
where topic_key = 'intertrochanteric_femur_fracture'
  and exists (
    select 1
    from jsonb_array_elements(resources) as resource
    where lower(coalesce(resource->>'title', '')) ~
      '(avn|avascular necrosis|femoral head necrosis|cerebral palsy|children|pediatric|scfe|perthes|ddh|developmental dysplasia|femoral neck)'
  );

notify pgrst, 'reload schema';

