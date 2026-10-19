using Microsoft.AspNetCore.Mvc;

namespace Learner.Api.Controllers;

/// <summary>Base for all API controllers: model validation, JSON, and the global auth requirement apply.</summary>
[ApiController]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase;
